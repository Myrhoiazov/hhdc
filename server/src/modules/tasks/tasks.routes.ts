import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { listTasks, createTask, updateTask, deleteTask } from './tasks.controller';

export const tasksRouter = Router();

tasksRouter.get('/', permitted('tasks.read'), listTasks);
tasksRouter.post('/', permitted('tasks.write'), createTask);
tasksRouter.patch('/:id', permitted('tasks.write'), updateTask);
tasksRouter.delete('/:id', permitted('tasks.write'), deleteTask);
