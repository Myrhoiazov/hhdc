import { z } from 'zod';

export const CUSTOM_FIELD_ENTITIES = ['PERSON', 'EVENT', 'REGISTRATION', 'CHOREOGRAPHER_ASSIGNMENT'] as const;
export const CUSTOM_FIELD_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'URL', 'EMAIL', 'PHONE'] as const;
export type CustomFieldType = typeof CUSTOM_FIELD_TYPES[number];

export interface FieldDefinition { key: string; type: string; required: boolean; options?: unknown }

const optionsOf = (definition: FieldDefinition) => z.array(z.string()).catch([]).parse(definition.options);
const oneOf = (definition: FieldDefinition) => z.string().refine(value => optionsOf(definition).includes(value), 'Value is not one of the options');

const VALIDATORS: Record<CustomFieldType, (definition: FieldDefinition) => z.ZodTypeAny> = {
    TEXT: () => z.string().max(500),
    TEXTAREA: () => z.string().max(10000),
    NUMBER: () => z.number().finite(),
    BOOLEAN: () => z.boolean(),
    DATE: () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    DATETIME: () => z.string().datetime({ offset: true }),
    SELECT: oneOf,
    MULTISELECT: definition => z.array(oneOf(definition)).max(50),
    URL: () => z.string().url().max(2000),
    EMAIL: () => z.string().email(),
    PHONE: () => z.string().regex(/^\+?[0-9 ()-]{7,20}$/),
};

const isEmpty = (value: unknown) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

// Returns the validated value, or null for a cleared optional field.
export const validateCustomValue = (definition: FieldDefinition, value: unknown): unknown => {
    if (isEmpty(value)) {
        if (definition.required) throw new Error(`${definition.key} is required`);
        return null;
    }
    const validator = VALIDATORS[definition.type as CustomFieldType];
    if (!validator) throw new Error(`Unsupported custom field type: ${definition.type}`);
    const result = validator(definition).safeParse(value);
    if (!result.success) throw new Error(`${definition.key}: ${result.error.issues[0].message}`);
    return result.data;
};

export const definitionSchema = z.object({
    entityType: z.enum(CUSTOM_FIELD_ENTITIES), key: z.string().regex(/^[a-z][a-z0-9_]{1,50}$/), label: z.string().trim().min(1).max(200),
    type: z.enum(CUSTOM_FIELD_TYPES), required: z.boolean().default(false), options: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
    active: z.boolean().default(true), sortOrder: z.number().int().min(0).max(10000).default(0),
}).strict().refine(input => !['SELECT', 'MULTISELECT'].includes(input.type) || Boolean(input.options?.length), 'Select fields need options');
