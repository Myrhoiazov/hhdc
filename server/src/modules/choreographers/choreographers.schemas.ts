import { z } from 'zod';
import { TravelStatus, HotelStatus } from '@prisma/client';

export const CreateChoreographerProfileSchema = z.object({
  bio: z.string().optional(),
  socialLinks: z.record(z.any()).optional(),
  agencyName: z.string().optional(),
});

export const UpdateChoreographerProfileSchema = CreateChoreographerProfileSchema.partial();

export const UpdateEventChoreographerSchema = z.object({
  travelStatus: z.nativeEnum(TravelStatus).optional(),
  hotelStatus: z.nativeEnum(HotelStatus).optional(),
  roleTitle: z.string().optional(),
  bioOverride: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateChoreographerCostSchema = z.object({
  type: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  description: z.string().optional(),
});

export const UpdateChoreographerCostSchema = z.object({
  type: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().optional(),
});
