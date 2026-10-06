import { Router } from 'express';
import { permitted } from '../auth/auth.middleware';
import { ticketingService } from './ticketing.service';
import prisma from '../../../prisma/prisma-client';

export const ticketingRouter = Router();

ticketingRouter.post('/ticketing/sync', permitted('ticketing.sync'), async (req, res, next) => {
  try {
    const { providerConnectionId } = req.body;
    if (!providerConnectionId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'providerConnectionId is required' } });
      return;
    }
    
    const result = await ticketingService.syncAll(providerConnectionId);
    res.json({ data: { message: 'Sync completed', result } });
  } catch (error) {
    next(error);
  }
});

ticketingRouter.get('/orders', permitted('ticketing.read'), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { buyer: true },
    });
    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
});

ticketingRouter.get('/orders/:id', permitted('ticketing.read'), async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { tickets: true } }, buyer: true },
    });
    if (!order) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      return;
    }
    res.json({ data: order });
  } catch (error) {
    next(error);
  }
});

ticketingRouter.get('/tickets', permitted('ticketing.read'), async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { holder: true, order: true },
    });
    res.json({ data: tickets });
  } catch (error) {
    next(error);
  }
});

ticketingRouter.get('/tickets/:id', permitted('ticketing.read'), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { holder: true, order: true },
    });
    if (!ticket) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      return;
    }
    res.json({ data: ticket });
  } catch (error) {
    next(error);
  }
});
