import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import { activatePrompt, createPrompt, deletePrompt, listPrompts, updatePrompt } from './prompt.controller';

const router = express.Router();
const admin = requireRole(UserRole.ADMIN);

router.get('/', asyncHandler(isToken), admin, asyncHandler(listPrompts));
router.post('/', asyncHandler(isToken), admin, asyncHandler(createPrompt));
router.patch('/:id', asyncHandler(isToken), admin, asyncHandler(updatePrompt));
router.post('/:id/activate', asyncHandler(isToken), admin, asyncHandler(activatePrompt));
router.delete('/:id', asyncHandler(isToken), admin, asyncHandler(deletePrompt));

export default router;
