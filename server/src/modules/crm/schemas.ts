import { z } from 'zod';
import { PersonRoleType, PersonStatus, EventStatus, ChoreographerStatus, RegistrationStatus } from '@prisma/client';

const text = z.string().trim().max(500);
const optionalText = text.nullable().optional();
export const personSchema = z.object({
    firstName: text.min(1), lastName: text.default(''), displayName: text.optional(),
    email: z.string().email().transform(value => value.toLowerCase()).nullable().optional(), phone: optionalText,
    birthDate: z.coerce.date().nullable().optional(), language: optionalText, country: optionalText,
    notes: z.string().max(10000).nullable().optional(), status: z.nativeEnum(PersonStatus).optional(),
}).strict();
export const roleSchema = z.object({ role: z.nativeEnum(PersonRoleType) }).strict();
export const eventSchema = z.object({
    name: text.min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),
    description: z.string().max(10000).nullable().optional(), status: z.nativeEnum(EventStatus).optional(),
    startAt: z.coerce.date(), endAt: z.coerce.date(), timezone: text.min(1).refine(value => {
        try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
    }, 'Invalid timezone'),
    venueName: optionalText, address: optionalText, city: optionalText, country: optionalText,
    capacity: z.number().int().positive().nullable().optional(),
}).strict();
export const registrationSchema = z.object({ personId: z.string().uuid(), status: z.nativeEnum(RegistrationStatus).default('CONFIRMED'), notes: optionalText }).strict();
export const choreographerSchema = z.object({ personId: z.string().uuid(), roleTitle: text.min(1), status: z.nativeEnum(ChoreographerStatus).default('INVITED'), bioOverride: optionalText, notes: optionalText }).strict();
