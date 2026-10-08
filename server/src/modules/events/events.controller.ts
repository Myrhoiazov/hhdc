import { z } from 'zod';
import { CreateSessionSchema, UpdateSessionSchema } from './events.schemas';
import { Request } from 'express';
import { eventFiltersSchema, eventSchema, registrationFiltersSchema } from './events.schemas';
import { choreographerSchema, registrationSchema } from '../crm/schemas';
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
    const { data, total } = await eventsService.listEvents(eventFiltersSchema.parse(req.query), skip, pageSize);
    req.res!.json({ data, meta: { page, pageSize, total } });
};


export const listRegistrations = async (req: Request) => {
    const eventId = entityId(req);
    await eventsService.requireEvent(eventId);
    const { page, pageSize, skip } = normalizePagination(req.query);
    const { data, total } = await eventsService.listRegistrations(eventId, registrationFiltersSchema.parse(req.query), { skip, take: pageSize });
    req.res!.json({ data, meta: { page, pageSize, total } });
};

export async function listSessions(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return eventsService.listSessions(id);
}

export async function createSession(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = CreateSessionSchema.parse(req.body);
    return eventsService.createSession(id, data as any);
}

export async function updateSession(req: Request) {
    const { id, sessionId } = z.object({ id: z.string().uuid(), sessionId: z.string().uuid() }).parse(req.params);
    const data = UpdateSessionSchema.parse(req.body);
    return eventsService.updateSession(id, sessionId, data);
}

export const createRegistration = async (req: Request) => {
    const eventId = entityId(req);
    await eventsService.requireEvent(eventId);
    const input = registrationSchema.parse(req.body);
    return prisma.$transaction(async tx => {
        const registration = await tx.registration.create({ data: { eventId, personId: input.personId, status: input.status, notes: input.notes } });
        await tx.personRole.upsert({ where: { personId_role: { personId: input.personId, role: 'PARTICIPANT' } }, create: { personId: input.personId, role: 'PARTICIPANT' }, update: {} });
        await recordHistory(tx, req, { type: 'REGISTRATION_CREATED', entityType: 'Registration', entityId: registration.id, personId: input.personId, eventId });
        return registration;
    });
};

export const assignChoreographer = async (req: Request) => {
    const eventId = entityId(req);
    await eventsService.requireEvent(eventId);
    const input = choreographerSchema.parse(req.body);
    return prisma.$transaction(async tx => {
        const assignment = await tx.eventChoreographer.create({ data: { eventId, personId: input.personId, roleTitle: input.roleTitle, status: input.status, bioOverride: input.bioOverride, notes: input.notes } });
        await tx.personRole.upsert({ where: { personId_role: { personId: input.personId, role: 'CHOREOGRAPHER' } }, create: { personId: input.personId, role: 'CHOREOGRAPHER' }, update: {} });
        const type = input.status === 'CONFIRMED' ? 'CHOREOGRAPHER_CONFIRMED' : 'CHOREOGRAPHER_ASSIGNED';
        await recordHistory(tx, req, { type, entityType: 'EventChoreographer', entityId: assignment.id, personId: input.personId, eventId });
        return assignment;
    });
};
