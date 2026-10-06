import { Router } from 'express';
import { route } from '../../common/http';
import * as dashboardController from './dashboard.controller';
import { permitted } from '../auth/auth.middleware';

export const dashboardRouter = Router();

// Requires some generic read permission or a specific dashboard permission
// Assuming dashboard.read or similar, or just require auth
dashboardRouter.get('/summary', permitted('dashboard.read'), route(dashboardController.getDashboardSummary));
