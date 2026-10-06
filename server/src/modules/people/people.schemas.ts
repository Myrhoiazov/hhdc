import { z } from 'zod';
import { PersonRoleType, PersonStatus } from '@prisma/client';

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
