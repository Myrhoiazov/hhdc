import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { route } from '../../common/http';
import * as controller from './events.controller';

export const eventsRouter = Router();

eventsRouter.get('/', permitted('events.read'), async (req, res, next) => { try { await controller.listEvents(req); } catch (e) { next(e); } });
eventsRouter.post('/', permitted('events.write'), route(controller.createEvent));
eventsRouter.patch('/:id', permitted('events.write'), route(controller.updateEvent));
eventsRouter.get('/:id', permitted('events.read'), route(controller.getEvent));

