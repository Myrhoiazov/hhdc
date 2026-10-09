import { z } from 'zod';
import { PersonRoleType, PersonSource, PersonStatus } from '@prisma/client';
import { blankAsMissing } from '../../common/filters';

const text = z.string().trim().max(500);
const optionalText = text.nullable().optional();

export const personSchema = z.object({
    firstName: text.min(1),
    lastName: text.default(''),
    displayName: text.optional(),
    email: z.string().email().transform(value => value.toLowerCase()).nullable().optional(),
    phone: optionalText,
    birthDate: z.coerce.date().nullable().optional(),
    language: optionalText,
    country: optionalText,
    notes: z.string().max(10000).nullable().optional(),
    status: z.nativeEnum(PersonStatus).optional(),
}).strict();

export const roleSchema = z.object({
    role: z.nativeEnum(PersonRoleType)
}).strict();

// Filters of the people list. Paging fields travel in the same query and are read separately;
// an empty value means "no filter".
export const peopleFiltersSchema = z.object({
    q: z.preprocess(blankAsMissing, z.string().trim().max(200).optional()),
    role: z.preprocess(blankAsMissing, z.nativeEnum(PersonRoleType).optional()),
    source: z.preprocess(blankAsMissing, z.nativeEnum(PersonSource).optional()),
    purchases: z.preprocess(blankAsMissing, z.enum(['yes', 'no']).optional()),
    // Only people an expense can be paid to: choreographers and staff.
    payees: z.preprocess(blankAsMissing, z.enum(['yes']).optional()),
});
