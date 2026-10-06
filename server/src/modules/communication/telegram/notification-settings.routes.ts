import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../../auth/auth.middleware';
import {
    listTelegramNotificationSettingsController,
    updateTelegramNotificationSettingController,
} from './notification-settings.controller';

const router = express.Router();

router.get('/', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(listTelegramNotificationSettingsController));
router.put('/:key', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(updateTelegramNotificationSettingController));

export default router;
