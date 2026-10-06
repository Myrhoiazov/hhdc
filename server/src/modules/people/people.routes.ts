import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { route } from '../../common/http';
import * as peopleController from './people.controller';

export const peopleRouter = Router();

// Person CRUD
peopleRouter.get('/', permitted('people.read'), async (req, _res, next) => {
    try { await peopleController.listPeople(req); } catch (error) { next(error); }
});
peopleRouter.post('/', permitted('people.write'), route(peopleController.createPerson));
peopleRouter.get('/:id', permitted('people.read'), route(peopleController.getPerson));
peopleRouter.patch('/:id', permitted('people.write'), route(peopleController.updatePerson));
peopleRouter.put('/:id', permitted('people.write'), route(peopleController.updatePerson));

// Roles
peopleRouter.post('/:id/roles', permitted('people.write'), route(peopleController.assignRole));
peopleRouter.delete('/:id/roles/:role', permitted('people.write'), route(peopleController.removeRole));

// Tags
peopleRouter.post('/:id/tags', permitted('people.write'), route(peopleController.assignTag));
peopleRouter.delete('/:id/tags/:tagId', permitted('people.write'), route(peopleController.removeTag));

// Activity
peopleRouter.get('/:id/activity', permitted('people.read'), async (req, _res, next) => {
    try { await peopleController.getPersonActivity(req); } catch (error) { next(error); }
});
