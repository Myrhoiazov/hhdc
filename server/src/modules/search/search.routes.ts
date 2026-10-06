import { Router } from 'express';
import { route } from '../../common/http';
import * as searchController from './search.controller';
import { permitted } from '../auth/auth.middleware';

export const searchRouter = Router();

// Search might require generic search permission or basic read
searchRouter.get('/', permitted('search.read'), route(searchController.search));
