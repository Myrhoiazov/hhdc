import { RequestHandler } from 'express';
import prisma from '../../../prisma/prisma-client';

export const listNotifications: RequestHandler = async (req, res, next) => {
  try {
    const { isRead } = req.query;
    // Assuming req.res.locals.user is set by auth middleware
    const userId = res.locals.user?.id;
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ data: notifications });
  } catch (err) {
    next(err);
  }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = res.locals.user?.id;
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const notification = await prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });

    res.json({ data: notification });
  } catch (err) {
    next(err);
  }
};
