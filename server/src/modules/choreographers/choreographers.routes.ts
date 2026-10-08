import { Router } from 'express';
import { route } from '../../common/http';
import * as controller from './choreographers.controller';
import { permitted } from '../auth/auth.middleware';
import { choreographerProfileRoutes } from './profile.routes';
import { choreographerContentRoutes } from './content.routes';
import { choreographerFinanceReadRoutes } from './finance.routes';
import { choreographerDocumentRoutes } from '../documents/document-files.routes';

export const choreographerRoutes = Router();

// V2.1 profile endpoints: `/`, `/:personId`. The one-segment paths do not collide with the
// two-segment legacy routes below.
choreographerRoutes.use(choreographerProfileRoutes);
choreographerRoutes.use(choreographerContentRoutes);
choreographerRoutes.use(choreographerFinanceReadRoutes);
choreographerRoutes.use(choreographerDocumentRoutes);

// Profile
choreographerRoutes.get('/profile/:personId', permitted('people.read'), route(controller.getProfile));
choreographerRoutes.put('/profile/:personId', permitted('people.write'), route(controller.upsertProfile));

// Event Choreographer updates (for travel, hotel, roles)
choreographerRoutes.patch('/event-assignment/:id', permitted('events.write'), route(controller.updateEventChoreographer));

// Costs (legacy V2 endpoints). Money is read and written with the finance permissions, like the V2.1 ledger.
choreographerRoutes.get('/event-assignment/:eventChoreographerId/costs', permitted('choreographers.finance.read'), route(controller.listCosts));
choreographerRoutes.post('/event-assignment/:eventChoreographerId/costs', permitted('choreographers.finance.write'), route(controller.createCost));
choreographerRoutes.get('/costs/:id', permitted('choreographers.finance.read'), route(controller.getCost));
choreographerRoutes.patch('/costs/:id', permitted('choreographers.finance.write'), route(controller.updateCost));
choreographerRoutes.delete('/costs/:id', permitted('choreographers.finance.write'), route(controller.deleteCost));
