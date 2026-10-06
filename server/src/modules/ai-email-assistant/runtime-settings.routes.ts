import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import { getRuntimeSettings, testRuntimeSettings, updateRuntimeSettings } from './runtime-settings.controller';
const router = express.Router();
router.get('/', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(getRuntimeSettings));
router.put('/', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(updateRuntimeSettings));
router.post('/test', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(testRuntimeSettings));
export default router;
