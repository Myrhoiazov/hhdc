import { z } from 'zod';

// Typed automation condition DSL (ADR 0012). Conditions are data evaluated against a
// read-only context; they can never reach code, SQL or object prototypes.
const OPERATORS = ['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists'] as const;
type Operator = typeof OPERATORS[number];
type Scalar = string | number | boolean;

export interface ConditionRule { field: string; operator: Operator; value?: Scalar | Scalar[] }
export type ConditionNode = ConditionRule | { all: ConditionNode[] } | { any: ConditionNode[] };
export type ConditionContext = Record<string, unknown>;

const scalar = z.union([z.string().max(500), z.number(), z.boolean()]);
const ruleSchema = z.object({
    field: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*){0,4}$/),
    operator: z.enum(OPERATORS),
    value: z.union([scalar, z.array(scalar).max(100)]).optional(),
}).strict();

const MAX_DEPTH = 4;
const nodeSchema = (depth: number): z.ZodType<ConditionNode> => {
    if (depth >= MAX_DEPTH) return ruleSchema as unknown as z.ZodType<ConditionNode>;
    const child = z.lazy(() => nodeSchema(depth + 1));
    return z.union([
        ruleSchema,
        z.object({ all: z.array(child).max(20) }).strict(),
        z.object({ any: z.array(child).min(1).max(20) }).strict(),
    ]) as unknown as z.ZodType<ConditionNode>;
};

export const conditionsSchema = nodeSchema(0);

const UNSAFE_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export const readField = (context: ConditionContext, path: string): unknown => {
    let current: unknown = context;
    for (const segment of path.split('.')) {
        if (UNSAFE_SEGMENTS.has(segment) || typeof current !== 'object' || current === null) return undefined;
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
};

const asNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value));
const compareNumbers = (test: (actual: number, expected: number) => boolean) => (actual: unknown, expected: unknown) => {
    const [left, right] = [asNumber(actual), asNumber(expected)];
    return actual !== undefined && actual !== null && !Number.isNaN(left) && !Number.isNaN(right) && test(left, right);
};
const contains = (actual: unknown, expected: unknown) => {
    if (Array.isArray(actual)) return actual.includes(expected);
    return typeof actual === 'string' && typeof expected === 'string' && actual.toLowerCase().includes(expected.toLowerCase());
};

const EVALUATORS: Record<Operator, (actual: unknown, expected: unknown) => boolean> = {
    eq: (actual, expected) => actual === expected,
    neq: (actual, expected) => actual !== expected,
    in: (actual, expected) => Array.isArray(expected) && expected.includes(actual as Scalar),
    gt: compareNumbers((actual, expected) => actual > expected),
    gte: compareNumbers((actual, expected) => actual >= expected),
    lt: compareNumbers((actual, expected) => actual < expected),
    lte: compareNumbers((actual, expected) => actual <= expected),
    contains,
    exists: (actual, expected) => (actual !== undefined && actual !== null) === (expected ?? true),
};

export function evaluateConditions(node: ConditionNode, context: ConditionContext): boolean {
    if ('all' in node) return node.all.every(child => evaluateConditions(child, context));
    if ('any' in node) return node.any.some(child => evaluateConditions(child, context));
    return EVALUATORS[node.operator](readField(context, node.field), node.value);
}

export const parseConditions = (conditions: unknown): ConditionNode => {
    const isEmptyObject = typeof conditions === 'object' && conditions !== null && Object.keys(conditions).length === 0;
    return conditionsSchema.parse(isEmptyObject ? { all: [] } : conditions);
};
