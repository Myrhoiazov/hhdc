import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Safe segment filter DSL (ADR 0019). Stored definitions are data, never SQL:
// every field is whitelisted and compiled into a typed Prisma filter.
const scalar = z.union([z.string().max(200), z.number(), z.boolean()]);
const ruleSchema = z.object({
    field: z.string().max(100),
    operator: z.enum(['eq', 'neq', 'in']),
    value: z.union([scalar, z.array(scalar).min(1).max(100)]),
}).strict();

type Scalar = string | number | boolean;
export interface SegmentRule { field: string; operator: 'eq' | 'neq' | 'in'; value: Scalar | Scalar[] }
export type SegmentNode = SegmentRule | { all: SegmentNode[] } | { any: SegmentNode[] };

const MAX_DEPTH = 4;
const nodeSchema = (depth: number): z.ZodType<SegmentNode> => {
    if (depth >= MAX_DEPTH) return ruleSchema as unknown as z.ZodType<SegmentNode>;
    const child = z.lazy(() => nodeSchema(depth + 1));
    return z.union([
        ruleSchema,
        z.object({ all: z.array(child).max(20) }).strict(),
        z.object({ any: z.array(child).min(1).max(20) }).strict(),
    ]) as unknown as z.ZodType<SegmentNode>;
};

export const segmentDefinitionSchema = nodeSchema(0);

type Where = Prisma.PersonWhereInput;
type Comparison = string | number | boolean | { not: unknown } | { in: unknown[] };

const comparison = (rule: SegmentRule): Comparison => {
    if (rule.operator === 'in') return { in: Array.isArray(rule.value) ? rule.value : [rule.value] };
    if (Array.isArray(rule.value)) throw new Error(`Operator ${rule.operator} requires a single value for ${rule.field}`);
    return rule.operator === 'neq' ? { not: rule.value } : rule.value;
};

const personScalar = (column: string) => (rule: SegmentRule): Where => ({ [column]: comparison(rule) });
const REGISTRATION_PREFIX = 'registration.';

const FIELD_COMPILERS: Record<string, (rule: SegmentRule) => Where> = {
    'person.language': personScalar('language'),
    'person.country': personScalar('country'),
    'person.status': personScalar('status'),
    'person.source': personScalar('source'),
    'person.role': rule => ({ roles: { some: { role: comparison(rule) as Prisma.EnumPersonRoleTypeFilter } } }),
    'person.tag': rule => ({ tags: { some: { tag: { slug: comparison(rule) as Prisma.StringFilter } } } }),
    'registration.eventId': rule => ({ registrations: { some: { eventId: comparison(rule) as Prisma.UuidFilter } } }),
    'registration.status': rule => ({ registrations: { some: { status: comparison(rule) as Prisma.EnumRegistrationStatusFilter } } }),
};

export const SEGMENT_FIELDS = Object.keys(FIELD_COMPILERS);

const isRule = (node: SegmentNode): node is SegmentRule => 'field' in node;

const compileRule = (rule: SegmentRule): Where => {
    const compiler = FIELD_COMPILERS[rule.field];
    if (!compiler) throw new Error(`Unsupported segment field: ${rule.field}`);
    return compiler(rule);
};

// Registration rules inside one `all` group must describe the SAME registration
// ("event = X AND status = CONFIRMED"), so they are merged into a single relation filter.
const mergeRegistrationRules = (rules: SegmentRule[]): Where[] => {
    if (rules.length < 2) return rules.map(compileRule);
    const column = (rule: SegmentRule) => rule.field.slice(REGISTRATION_PREFIX.length);
    const conditions = rules.map(rule => ({ [column(rule)]: comparison(rule) }));
    return [{ registrations: { some: { AND: conditions } } }];
};

const compileAll = (nodes: SegmentNode[]): Where => {
    const isRegistrationRule = (node: SegmentNode): node is SegmentRule => isRule(node) && node.field.startsWith(REGISTRATION_PREFIX);
    const registrationRules = nodes.filter(isRegistrationRule);
    registrationRules.forEach(compileRule);
    const others = nodes.filter(node => !isRegistrationRule(node)).map(compileSegment);
    return { AND: [...mergeRegistrationRules(registrationRules), ...others] };
};

export function compileSegment(node: SegmentNode): Where {
    if (isRule(node)) return compileRule(node);
    if ('all' in node) return compileAll(node.all);
    return { OR: node.any.map(compileSegment) };
}

export const parseSegmentDefinition = (definition: unknown): SegmentNode => {
    const isEmptyObject = typeof definition === 'object' && definition !== null && Object.keys(definition).length === 0;
    return segmentDefinitionSchema.parse(isEmptyObject ? { all: [] } : definition);
};

export const segmentWhere = (definition: unknown): Where => compileSegment(parseSegmentDefinition(definition));
