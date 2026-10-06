import { RequestHandler } from 'express';
import { TaskStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});

export const listTasks: RequestHandler = async (req, res, next) => {
  try {
    const { status, assigneeId } = req.query;
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (assigneeId && typeof assigneeId === 'string') {
      where.assigneeId = assigneeId;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
};

export const createTask: RequestHandler = async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const { assigneeId, dueDate, ...rest } = data;
    
    const createData: any = { ...rest };
    if (dueDate) createData.dueDate = new Date(dueDate);
    if (assigneeId) createData.assigneeId = assigneeId;

    const task = await prisma.task.create({
      data: createData,
    });
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTask: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateTaskSchema.parse(req.body);
    const { assigneeId, dueDate, ...rest } = data;
    
    const updateData: any = { ...rest };
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
};

export const deleteTask: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
