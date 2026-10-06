import { Router } from 'express';
import { route } from '../../common/http';
import * as controller from './documents.controller';
import { permitted } from '../auth/auth.middleware';

export const documentRoutes = Router();

// Templates
documentRoutes.get('/templates', permitted('events.read'), route(controller.listTemplates));
documentRoutes.post('/templates', permitted('events.write'), route(controller.createTemplate));
documentRoutes.get('/templates/:id', permitted('events.read'), route(controller.getTemplate));
documentRoutes.patch('/templates/:id', permitted('events.write'), route(controller.updateTemplate));
documentRoutes.delete('/templates/:id', permitted('events.write'), route(controller.deleteTemplate));

// Documents
documentRoutes.get('/', permitted('events.read'), route(controller.listDocuments));
documentRoutes.post('/', permitted('events.write'), route(controller.createDocument));
documentRoutes.get('/:id', permitted('events.read'), route(controller.getDocument));
documentRoutes.patch('/:id', permitted('events.write'), route(controller.updateDocument));
documentRoutes.delete('/:id', permitted('events.write'), route(controller.deleteDocument));
