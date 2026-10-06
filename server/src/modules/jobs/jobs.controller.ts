import { RequestHandler } from 'express';
import prisma from '../../../prisma/prisma-client';

export const listJobs: RequestHandler = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (type && typeof type === 'string') {
      where.type = type;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ data: jobs });
  } catch (err) {
    next(err);
  }
};
