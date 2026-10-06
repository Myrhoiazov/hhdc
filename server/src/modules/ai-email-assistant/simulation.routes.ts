import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import { simulateEmailAssistant, listSimulationRuns, getSimulationRun } from './simulation.controller';

const router = express.Router();

router.post('/simulate', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(simulateEmailAssistant));
router.get('/simulation-runs', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(listSimulationRuns));
router.get('/simulation-runs/:id', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(getSimulationRun));

export default router;
