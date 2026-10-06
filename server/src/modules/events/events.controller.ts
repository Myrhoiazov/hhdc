import { Request } from 'express';
import { eventSchema } from './events.schemas';
import * as eventsService from './events.service';
import { recordHistory } from '../audit/audit.service';
import { ApiError, entityId, normalizePagination } from '../../common/http';
import prisma from '../../../prisma/prisma-client';

export const createEvent = async (req: Request) => {
    const input = eventSchema.parse(req.body);
    
    return prisma.$transaction(async tx => {
        const created = await tx.event.create({
            data: {
                ...input,
                name: input.name,
                slug: input.slug,
                startAt: input.startAt,
                endAt: input.endAt,
                timezone: input.timezone
            }
        });
        await recordHistory(tx, req, { 
            type: 'EVENT_CREATED', 
            entityType: 'Event', 
            entityId: created.id, 
            eventId: created.id 
        });
        return created;
    });
};

export const updateEvent = async (req: Request) => {
    const id = entityId(req);
    const before = await eventsService.requireEvent(id);
    const input = eventSchema.partial().parse(req.body);
    
    eventsService.validateDates(input.startAt ?? before.startAt, input.endAt ?? before.endAt);

    return prisma.$transaction(async tx => {
        const updated = await tx.event.update({ where: { id }, data: input });
        await recordHistory(tx, req, { 
            type: 'EVENT_UPDATED', 
            entityType: 'Event', 
            entityId: id, 
            eventId: id 
        });
        return updated;
    });
};

export const getEvent = async (req: Request) => {
    const id = entityId(req);
    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            choreographers: { include: { person: true } },
            registrations: { include: { person: true } }
        }
    });
    
    if (!event) {
        throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
    }
    
    return event;
};

export const listEvents = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const { data, total } = await eventsService.listEvents(skip, pageSize);
    req.res!.json({ data, meta: { page, pageSize, total } });
};
