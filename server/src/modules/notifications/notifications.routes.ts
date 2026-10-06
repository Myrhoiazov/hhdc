import { Router } from 'express';
import { listNotifications, markAsRead } from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.get('/', listNotifications);
notificationsRouter.patch('/:id/read', markAsRead);
