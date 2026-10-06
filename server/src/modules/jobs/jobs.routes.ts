import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { listJobs } from './jobs.controller';

export const jobsRouter = Router();

jobsRouter.get('/', permitted('operations.read'), listJobs);
