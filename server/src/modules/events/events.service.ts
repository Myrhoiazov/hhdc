import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { Event, Prisma } from '@prisma/client';

export const requireEvent = async (id: string) => {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
    return event;
};

export const validateDates = (startAt: Date, endAt: Date) => {
    if (endAt <= startAt) throw new ApiError(400, 'INVALID_EVENT_DATES', 'Event must end after it starts');
};

export const createEvent = async (data: Prisma.EventCreateInput) => {
    validateDates(new Date(data.startAt), new Date(data.endAt));
    return prisma.event.create({ data });
};

export const updateEvent = async (id: string, data: Prisma.EventUpdateInput) => {
    const existing = await requireEvent(id);
    const startAt = data.startAt ? new Date(data.startAt as string | Date) : existing.startAt;
    const endAt = data.endAt ? new Date(data.endAt as string | Date) : existing.endAt;
    validateDates(startAt, endAt);
    
    return prisma.event.update({ where: { id }, data });
};

export const getEvent = async (id: string) => {
    return requireEvent(id);
};

export const listEvents = async (skip: number, take: number) => {
    const [data, total] = await prisma.$transaction([
        prisma.event.findMany({ skip, take, orderBy: { startAt: 'desc' } }),
        prisma.event.count()
    ]);
    return { data, total };
};

export async function listSessions(eventId: string) {
    return prisma.eventSession.findMany({
        where: { eventId },
        include: { room: true, choreographers: { include: { choreographer: true } } },
        orderBy: { startAt: 'asc' }
    });
}

export async function createSession(eventId: string, data: { name: string, description?: string, startAt: Date, endAt: Date, capacity?: number, roomId?: string, choreographerIds?: string[] }) {
    await ensureNoConflicts(eventId, data);
    return prisma.$transaction(async (tx) => {
        const { choreographerIds, ...rest } = data;
        const session = await tx.eventSession.create({
            data: {
                name: rest.name,
                description: rest.description,
                startAt: rest.startAt,
                endAt: rest.endAt,
                capacity: rest.capacity,
                roomId: rest.roomId,
                eventId
            }
        });
        
        if (choreographerIds && choreographerIds.length > 0) {
            await tx.eventSessionChoreographer.createMany({
                data: choreographerIds.map((id: string) => ({
                    sessionId: session.id,
                    choreographerId: id
                }))
            });
        }
        
        return session;
    });
}

export async function updateSession(eventId: string, sessionId: string, data: z.infer<typeof import('./events.schemas').UpdateSessionSchema>) {
    const existing = await prisma.eventSession.findUnique({ where: { id: sessionId, eventId }, include: { choreographers: true } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Session not found');

    const checkData = {
        roomId: data.roomId !== undefined ? data.roomId : existing.roomId,
        startAt: data.startAt || existing.startAt,
        endAt: data.endAt || existing.endAt,
        choreographerIds: data.choreographerIds !== undefined ? data.choreographerIds : existing.choreographers.map(c => c.choreographerId)
    };
    
    await ensureNoConflicts(eventId, checkData as any, sessionId);

    return prisma.$transaction(async (tx) => {
        const { choreographerIds, ...rest } = data;
        
        const session = await tx.eventSession.update({
            where: { id: sessionId },
            data: rest
        });

        if (choreographerIds !== undefined) {
            await tx.eventSessionChoreographer.deleteMany({ where: { sessionId } });
            if (choreographerIds.length > 0) {
                await tx.eventSessionChoreographer.createMany({
                    data: choreographerIds.map(id => ({
                        sessionId,
                        choreographerId: id
                    }))
                });
            }
        }
        
        return session;
    });
}

async function ensureNoConflicts(eventId: string, data: { roomId?: string | null, startAt: Date, endAt: Date, choreographerIds?: string[] }, excludeSessionId?: string) {
    if (data.roomId) {
        const roomConflicts = await prisma.eventSession.findFirst({
            where: {
                roomId: data.roomId,
                id: { not: excludeSessionId },
                startAt: { lt: data.endAt },
                endAt: { gt: data.startAt }
            }
        });
        if (roomConflicts) {
            throw new ApiError(409, 'CONFLICT', `Room is already booked for this time (Session: ${roomConflicts.name})`);
        }
    }

    if (data.choreographerIds && data.choreographerIds.length > 0) {
        const choreographerConflicts = await prisma.eventSessionChoreographer.findFirst({
            where: {
                choreographerId: { in: data.choreographerIds },
                session: {
                    id: { not: excludeSessionId },
                    startAt: { lt: data.endAt },
                    endAt: { gt: data.startAt }
                }
            },
            include: { session: true }
        });

        if (choreographerConflicts) {
            throw new ApiError(409, 'CONFLICT', `Choreographer is already assigned to an overlapping session (Session: ${choreographerConflicts.session.name})`);
        }
    }
}
