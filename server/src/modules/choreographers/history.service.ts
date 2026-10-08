import { ChoreographerStatus, HotelStatus, Prisma, TravelStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { emitHistoryEvent } from '../outbox/outbox.service';
import { toHistory } from './history.rules';
import { assertChoreographer } from './profile.service';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => (value === '' ? null : value));

export const assignToEventSchema = z.object({
    eventId: z.string().uuid(),
    roleTitle: z.string().trim().min(1).max(120).default('Choreographer'),
    status: z.nativeEnum(ChoreographerStatus).default('INVITED'),
    notes: optionalText(2000),
}).strict();
export const updateAssignmentSchema = z.object({
    roleTitle: z.string().trim().min(1).max(120).optional(),
    status: z.nativeEnum(ChoreographerStatus).optional(),
    travelStatus: z.nativeEnum(TravelStatus).optional(),
    hotelStatus: z.nativeEnum(HotelStatus).optional(),
    notes: optionalText(2000),
}).strict();

const HISTORY_FIELDS = {
    id: true, status: true, roleTitle: true, travelStatus: true, hotelStatus: true, notes: true,
    event: { select: { id: true, name: true, status: true, startAt: true, endAt: true, city: true } },
    sessions: { select: { session: { select: { id: true, name: true, startAt: true } } } },
} as const;

type AssignmentRow = Prisma.EventChoreographerGetPayload<{ select: typeof HISTORY_FIELDS }>;
const toRow = ({ sessions, ...row }: AssignmentRow) => ({ ...row, sessions: sessions.map(item => item.session) });

// Every event the person was or will be part of, across all years. One assignment per event.
export const listEventHistory = async (personId: string, now = new Date()) => {
    await assertChoreographer(personId);
    const rows = await prisma.eventChoreographer.findMany({ where: { personId }, select: HISTORY_FIELDS });
    return toHistory(rows.map(toRow), now);
};

interface Actor { userId: string }

const history = (tx: Prisma.TransactionClient, type: string, assignment: { id: string; personId: string; eventId: string }, actor: Actor) => Promise.all([
    tx.activity.create({ data: { personId: assignment.personId, eventId: assignment.eventId, actorUserId: actor.userId, type, entityType: 'EventChoreographer', entityId: assignment.id, metadata: {} } }),
    tx.auditLog.create({ data: { actorUserId: actor.userId, action: type, entityType: 'EventChoreographer', entityId: assignment.id } }),
    emitHistoryEvent(tx, { type, entityType: 'EventChoreographer', entityId: assignment.id, personId: assignment.personId, eventId: assignment.eventId }),
]);

const isDuplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// Works for upcoming and for historic events alike: the event must already exist in Events.
export const assignToEvent = async (personId: string, input: z.infer<typeof assignToEventSchema>, actor: Actor) => {
    await assertChoreographer(personId);
    const event = await prisma.event.findUnique({ where: { id: input.eventId }, select: { id: true } });
    if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
    try {
        return await prisma.$transaction(async tx => {
            const assignment = await tx.eventChoreographer.create({ data: { personId, eventId: input.eventId, roleTitle: input.roleTitle, status: input.status, notes: input.notes } });
            await history(tx, input.status === 'CONFIRMED' ? 'CHOREOGRAPHER_CONFIRMED' : 'CHOREOGRAPHER_ASSIGNED', assignment, actor);
            return assignment;
        });
    } catch (error) {
        if (isDuplicate(error)) throw new ApiError(409, 'ALREADY_ASSIGNED', 'This choreographer is already assigned to the event');
        throw error;
    }
};

// The assignment must belong to this choreographer: an id from another profile is not found.
export const updateAssignment = async (personId: string, assignmentId: string, input: z.infer<typeof updateAssignmentSchema>, actor: Actor) => {
    const before = await prisma.eventChoreographer.findFirst({ where: { id: assignmentId, personId } });
    if (!before) throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');
    return prisma.$transaction(async tx => {
        const assignment = await tx.eventChoreographer.update({ where: { id: assignmentId }, data: input });
        const confirmed = input.status === 'CONFIRMED' && before.status !== 'CONFIRMED';
        await history(tx, confirmed ? 'CHOREOGRAPHER_CONFIRMED' : 'CHOREOGRAPHER_ASSIGNMENT_UPDATED', assignment, actor);
        return assignment;
    });
};
