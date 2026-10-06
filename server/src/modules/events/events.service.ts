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
