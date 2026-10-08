import { z } from 'zod';

// Filters of list pages arrive in the address, where "no filter" is an empty string.

export const blankAsMissing = (value: unknown) => (value === '' ? undefined : value);

// A filter that may be left out or left empty.
export const optionalFilter = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankAsMissing, schema.optional());

// A calendar day as the date inputs of the browser send it: 2026-10-08.
export const dayFilter = optionalFilter(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
