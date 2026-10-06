import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import {
    getPaymentReminderDeliveriesController,
    getPaymentReminderSettingsController,
    getPaymentReminderTemplatesController,
    runPaymentRemindersController,
    sendTestPaymentReminderController,
    updatePaymentReminderSettingsController,
    updatePaymentReminderTemplateController,
} from './payment-reminders.controller';

const router = express.Router();

router.get('/settings', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(getPaymentReminderSettingsController));
router.put('/settings', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(updatePaymentReminderSettingsController));
router.post('/run', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(runPaymentRemindersController));
router.get('/deliveries', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(getPaymentReminderDeliveriesController));
router.get('/templates', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(getPaymentReminderTemplatesController));
router.put('/templates/:language', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(updatePaymentReminderTemplateController));
router.post('/templates/:language/test', asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(sendTestPaymentReminderController));

export default router;
