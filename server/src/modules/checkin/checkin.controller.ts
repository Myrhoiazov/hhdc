import { Request } from 'express';
import { z } from 'zod';
import * as service from './checkin.service';
import { ApiError } from '../../common/http';
import { currentUser } from '../auth/auth.middleware';

export async function generateQrToken(req: Request) {
    const { registrationId } = z.object({ registrationId: z.string().uuid() }).parse(req.params);
    const token = await service.getOrGenerateQrToken(registrationId);
    return { token };
}

export async function scanCheckin(req: Request) {
    const { qrToken, sessionId } = z.object({
        qrToken: z.string(),
        sessionId: z.string().uuid()
    }).parse(req.body);
    
    return service.scanCheckin(qrToken, sessionId);
}

const entrySchema = z.object({ code: z.string().trim().min(1).max(200), eventId: z.string().uuid().optional(), override: z.boolean().default(false) }).strict();

const eventEntry = (method: 'QR' | 'MANUAL') => async (req: Request) => {
    const input = entrySchema.parse(req.body);
    const user = currentUser(req);
    if (input.override && !user.permissions.includes('checkin.override')) throw new ApiError(403, 'FORBIDDEN', 'Permission required');
    return service.checkInToEvent({ code: input.code, eventId: input.eventId, override: input.override, method, actorUserId: user.id });
};
export const scanEventEntry = eventEntry('QR');
export const manualEventEntry = eventEntry('MANUAL');

export async function searchRegistrations(req: Request) {
    const { eventId, q } = z.object({ eventId: z.string().uuid(), q: z.string().trim().min(2).max(200) }).parse(req.query);
    return service.searchRegistrations(eventId, q);
}
