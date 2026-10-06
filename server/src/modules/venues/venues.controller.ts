import { Request } from 'express';
import { z } from 'zod';
import * as service from './venues.service';
import { CreateVenueSchema, UpdateVenueSchema, CreateRoomSchema, UpdateRoomSchema } from './venues.schemas';

export async function listVenues(_req: Request) {
    return service.listVenues();
}

export async function createVenue(req: Request) {
    const data = CreateVenueSchema.parse(req.body);
    return service.createVenue(data as any);
}

export async function getVenue(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.getVenue(id);
}

export async function updateVenue(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = UpdateVenueSchema.parse(req.body);
    return service.updateVenue(id, data);
}

export async function createRoom(req: Request) {
    const { venueId } = z.object({ venueId: z.string().uuid() }).parse(req.params);
    const data = CreateRoomSchema.parse(req.body);
    return service.createRoom(venueId, data);
}

export async function updateRoom(req: Request) {
    const { venueId, id } = z.object({ venueId: z.string().uuid(), id: z.string().uuid() }).parse(req.params);
    const data = UpdateRoomSchema.parse(req.body);
    return service.updateRoom(venueId, id, data);
}

export async function deleteRoom(req: Request) {
    const { venueId, id } = z.object({ venueId: z.string().uuid(), id: z.string().uuid() }).parse(req.params);
    await service.deleteRoom(venueId, id);
    return { success: true };
}
