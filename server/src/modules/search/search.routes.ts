import express from 'express';
import { asyncHandler, isToken } from '../auth/auth.middleware';
import { searchRateLimit } from './search.rate-limit';
import { searchController } from './search.controller';

const router = express.Router();

router.get('/', asyncHandler(isToken), searchRateLimit, asyncHandler(searchController));

export default router;
