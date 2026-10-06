import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { CreateVenueSchema, UpdateVenueSchema, CreateRoomSchema, UpdateRoomSchema } from './venues.schemas';
import { z } from 'zod';

export async function listVenues() {
    return prisma.venue.findMany({
        orderBy: { name: 'asc' },
        include: { rooms: true }
    });
}

export async function createVenue(data: { name: string, address?: string, city?: string, country?: string }) {
    return prisma.venue.create({ data });
}

export async function updateVenue(id: string, data: z.infer<typeof UpdateVenueSchema>) {
    return prisma.venue.update({ where: { id }, data });
}

export async function getVenue(id: string) {
    const venue = await prisma.venue.findUnique({
        where: { id },
        include: { rooms: true }
    });
    if (!venue) throw new ApiError(404, 'NOT_FOUND', 'Venue not found');
    return venue;
}

export async function createRoom(venueId: string, data: z.infer<typeof CreateRoomSchema>) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new ApiError(404, 'NOT_FOUND', 'Venue not found');
    return prisma.room.create({ data: {
        name: data.name,
        capacity: data.capacity,
        venueId
    } });
}

export async function updateRoom(venueId: string, id: string, data: z.infer<typeof UpdateRoomSchema>) {
    return prisma.room.update({
        where: { id, venueId },
        data
    });
}

export async function deleteRoom(venueId: string, id: string) {
    await prisma.room.delete({ where: { id, venueId } });
}
