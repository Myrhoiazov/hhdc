import { z } from 'zod';

export const CreateVenueSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional()
});

export const UpdateVenueSchema = CreateVenueSchema.partial();

export const CreateRoomSchema = z.object({
    name: z.string().min(1),
    capacity: z.number().int().positive().optional()
});

export const UpdateRoomSchema = CreateRoomSchema.partial();
