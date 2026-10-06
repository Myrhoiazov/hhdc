import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { route } from '../../common/http';
import * as controller from './checkin.controller';

export const checkinRouter = Router();

checkinRouter.post('/registrations/:registrationId/qr-token', permitted('events.write'), route(controller.generateQrToken));
checkinRouter.post('/scan', permitted('checkin.use'), route(controller.scanCheckin));
checkinRouter.post('/event-entry', permitted('checkin.use'), route(controller.scanEventEntry));
checkinRouter.post('/manual', permitted('checkin.use'), route(controller.manualEventEntry));
checkinRouter.get('/search', permitted('checkin.use'), route(controller.searchRegistrations));
