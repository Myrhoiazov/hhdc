import { Request, Router } from 'express';
import { z } from 'zod';
import { listRoute, normalizePagination, route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { createChoreographerSchema, listChoreographersSchema, updateChoreographerSchema } from './profile.schemas';
import { createChoreographer, getChoreographer, listChoreographers, updateChoreographer } from './profile.service';

const personId = (req: Request) => z.string().uuid().parse(req.params.personId);

// Choreographer 360° profile (V2.1). Mounted on the existing /choreographers router.
export const choreographerProfileRoutes = Router();

choreographerProfileRoutes.get('/', permitted('choreographers.read'), listRoute(req => listChoreographers(listChoreographersSchema.parse({
    q: req.query.q, relationshipStatus: req.query.relationshipStatus,
}), normalizePagination({ page: req.query.page, pageSize: req.query.pageSize }))));
choreographerProfileRoutes.post('/', permitted('choreographers.create'), route(req => {
    const { personId: id, ...profile } = createChoreographerSchema.parse(req.body);
    return createChoreographer(id, profile, currentUser(req).id);
}));
choreographerProfileRoutes.get('/:personId', permitted('choreographers.read'), route(req => getChoreographer(personId(req))));
choreographerProfileRoutes.patch('/:personId', permitted('choreographers.update'), route(req => updateChoreographer(personId(req), updateChoreographerSchema.parse(req.body), currentUser(req).id)));
