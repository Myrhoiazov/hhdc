import { Request } from 'express';
import { z } from 'zod';
import * as service from './choreographers.service';
import { 
  UpdateChoreographerProfileSchema, 
  UpdateEventChoreographerSchema,
  CreateChoreographerCostSchema,
  UpdateChoreographerCostSchema
} from './choreographers.schemas';

export async function getProfile(req: Request) {
    const { personId } = z.object({ personId: z.string().uuid() }).parse(req.params);
    return service.getProfile(personId);
}

export async function upsertProfile(req: Request) {
    const { personId } = z.object({ personId: z.string().uuid() }).parse(req.params);
    const data = UpdateChoreographerProfileSchema.parse(req.body);
    return service.upsertProfile(personId, data);
}

export async function updateEventChoreographer(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = UpdateEventChoreographerSchema.parse(req.body);
    return service.updateEventChoreographer(id, data);
}

export async function listCosts(req: Request) {
    const { eventChoreographerId } = z.object({ eventChoreographerId: z.string().uuid() }).parse(req.params);
    return service.listCosts(eventChoreographerId);
}

export async function createCost(req: Request) {
    const { eventChoreographerId } = z.object({ eventChoreographerId: z.string().uuid() }).parse(req.params);
    const data = CreateChoreographerCostSchema.parse(req.body);
    return service.createCost(eventChoreographerId, data);
}

export async function getCost(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.getCost(id);
}

export async function updateCost(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = UpdateChoreographerCostSchema.parse(req.body);
    return service.updateCost(id, data);
}

export async function deleteCost(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await service.deleteCost(id);
    return { success: true };
}
