import { z } from 'zod';

export const eventSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    timezone: z.string().min(1),
    venueName: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    capacity: z.number().int().nonnegative().optional().nullable(),
});


export const CreateSessionSchemaBase = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    roomId: z.string().uuid().optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    capacity: z.number().int().positive().optional(),
    choreographerIds: z.array(z.string().uuid()).optional()
});
export const CreateSessionSchema = CreateSessionSchemaBase.refine(data => data.endAt > data.startAt, {
    message: "End time must be after start time",
    path: ["endAt"]
});


export const UpdateSessionSchema = CreateSessionSchemaBase.partial();
