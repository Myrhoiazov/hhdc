import express from 'express';
import { UserRole } from '@prisma/client';
import { getAuthSecurityEventsController } from './auth.security-events.controller';
import { asyncHandler, isToken, requireRole } from './auth.middleware';

const router = express.Router();

router.get('/', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(getAuthSecurityEventsController));

export default router;
