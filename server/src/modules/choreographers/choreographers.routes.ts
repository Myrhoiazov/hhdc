import { Router } from 'express';
import { route } from '../../common/http';
import * as controller from './choreographers.controller';
import { permitted } from '../auth/auth.middleware';

export const choreographerRoutes = Router();

// Profile
choreographerRoutes.get('/profile/:personId', permitted('people.read'), route(controller.getProfile));
choreographerRoutes.put('/profile/:personId', permitted('people.write'), route(controller.upsertProfile));

// Event Choreographer updates (for travel, hotel, roles)
choreographerRoutes.patch('/event-assignment/:id', permitted('events.write'), route(controller.updateEventChoreographer));

// Costs
choreographerRoutes.get('/event-assignment/:eventChoreographerId/costs', permitted('events.read'), route(controller.listCosts));
choreographerRoutes.post('/event-assignment/:eventChoreographerId/costs', permitted('events.write'), route(controller.createCost));
choreographerRoutes.get('/costs/:id', permitted('events.read'), route(controller.getCost));
choreographerRoutes.patch('/costs/:id', permitted('events.write'), route(controller.updateCost));
choreographerRoutes.delete('/costs/:id', permitted('events.write'), route(controller.deleteCost));
