import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import * as crypto from 'crypto';
import { emitDomainEvent } from '../outbox/outbox.service';

export async function getOrGenerateQrToken(registrationId: string) {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: { id: true, qrToken: true }
    });
    
    if (!registration) throw new ApiError(404, 'NOT_FOUND', 'Registration not found');
    
    if (registration.qrToken) {
        return registration.qrToken;
    }
    
    const qrToken = crypto.randomBytes(32).toString('hex');
    await prisma.registration.update({
        where: { id: registrationId },
        data: { qrToken }
    });
    
    return qrToken;
}

export async function scanCheckin(qrToken: string, sessionId: string) {
    const registration = await prisma.registration.findUnique({
        where: { qrToken }
    });
    
    if (!registration) {
        throw new ApiError(404, 'NOT_FOUND', 'Invalid QR token');
    }
    
    const session = await prisma.eventSession.findUnique({
        where: { id: sessionId }
    });
    
    if (!session) {
        throw new ApiError(404, 'NOT_FOUND', 'Session not found');
    }
    
    // Record SessionAttendance
    try {
        const attendance = await prisma.sessionAttendance.create({
            data: {
                registrationId: registration.id,
                sessionId: session.id
            }
        });
        
        return { success: true, attendance, registration };
    } catch (e: any) {
        if (e.code === 'P2002') {
            // Unique constraint failed on the fields: (`sessionId`,`registrationId`)
            throw new ApiError(409, 'CONFLICT', 'Already checked in for this session');
        }
        throw e;
    }
}

const ADMISSIBLE_TICKETS = ['VALID', 'USED'];
const entryInclude = { person: { select: { id: true, displayName: true } }, ticket: { select: { id: true, ticketType: true, status: true } }, event: { select: { id: true, name: true } } };

// Resolves an opaque scan value: a CRM check-in token or the external ticket barcode.
// Neither carries personal data; the lookup happens server-side for authenticated staff.
const resolveRegistration = async (code: string, eventId?: string) => {
    const byToken = await prisma.registration.findUnique({ where: { qrToken: code }, include: entryInclude });
    if (byToken) return byToken;
    return prisma.registration.findFirst({ where: { eventId, ticket: { barcode: code } }, include: entryInclude });
};

export interface EventCheckinParams { code: string; eventId?: string; method: 'QR' | 'MANUAL'; actorUserId: string; override: boolean }

export async function checkInToEvent({ code, eventId, method, actorUserId, override }: EventCheckinParams) {
    const registration = await resolveRegistration(code, eventId);
    if (!registration) throw new ApiError(404, 'NOT_FOUND', 'No registration matches this code');
    const ticketBlocked = registration.ticket && !ADMISSIBLE_TICKETS.includes(registration.ticket.status);
    if (registration.status === 'CANCELLED' || ticketBlocked) throw new ApiError(409, 'DO_NOT_ADMIT', 'Ticket or registration is cancelled. Do not admit.');
    if (registration.status === 'CHECKED_IN' && !override) throw new ApiError(409, 'ALREADY_CHECKED_IN', 'Already checked in');
    return prisma.$transaction(async tx => {
        const updated = await tx.registration.update({ where: { id: registration.id }, data: { status: 'CHECKED_IN' }, include: entryInclude });
        const action = registration.status === 'CHECKED_IN' ? 'CHECK_IN_OVERRIDE' : 'CHECK_IN_COMPLETED';
        await tx.activity.create({ data: { personId: registration.personId, eventId: registration.eventId, actorUserId, type: action, entityType: 'Registration', entityId: registration.id, metadata: { method } } });
        await tx.auditLog.create({ data: { actorUserId, action, entityType: 'Registration', entityId: registration.id } });
        await emitDomainEvent(tx, 'checkin.completed', { registrationId: registration.id, personId: registration.personId, eventId: registration.eventId });
        return { registration: updated, checkedInAt: new Date() };
    });
}

export const searchRegistrations = (eventId: string, query: string) => prisma.registration.findMany({
    where: { eventId, OR: [
        { person: { displayName: { contains: query, mode: 'insensitive' } } }, { person: { email: { contains: query, mode: 'insensitive' } } },
        { ticket: { barcode: query } }, { ticket: { externalId: query } },
    ] },
    include: entryInclude, take: 20,
});
