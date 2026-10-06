import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { route } from '../../common/http';
import * as controller from './venues.controller';

export const venuesRouter = Router();

venuesRouter.get('/', permitted('events.read'), route(controller.listVenues));
venuesRouter.post('/', permitted('events.write'), route(controller.createVenue));
venuesRouter.get('/:id', permitted('events.read'), route(controller.getVenue));
venuesRouter.patch('/:id', permitted('events.write'), route(controller.updateVenue));

venuesRouter.post('/:venueId/rooms', permitted('events.write'), route(controller.createRoom));
venuesRouter.patch('/:venueId/rooms/:id', permitted('events.write'), route(controller.updateRoom));
venuesRouter.delete('/:venueId/rooms/:id', permitted('events.write'), route(controller.deleteRoom));
