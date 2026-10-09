import { createHash } from 'node:crypto';
import { Request, Router } from 'express';
import { RefundStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { entityId, listRoute, normalizePagination, route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { crmLink } from '../telegram-notifications/crm-link';
import { announce } from '../telegram-notifications/announce';
import { getLedgerSummary, ledgerFiltersSchema, listLedger } from './ledger';
import { decideRefund, eventFinancialOverview, importPayment, importPaymentSchema, processRefund, refreshPaymentFromProvider, refundRequestSchema, requestRefund, syncRefund } from './finance.service';

const listPayments = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const where = z.object({ status: z.string().max(40).optional(), personId: z.string().uuid().optional() }).parse({ status: req.query.status, personId: req.query.personId });
    const [data, total] = await prisma.$transaction([
        prisma.payment.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { person: { select: { id: true, displayName: true } } } }),
        prisma.payment.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
};

const listRefunds = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const where = z.object({ status: z.nativeEnum(RefundStatus).optional() }).parse({ status: req.query.status });
    const [data, total] = await prisma.$transaction([
        prisma.refund.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { person: { select: { id: true, displayName: true } } } }),
        prisma.refund.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
};

// Payments, refunds and costs as one list, and what they add up to under the same filters.
const listLedgerPage = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const { data, total } = await listLedger(ledgerFiltersSchema.parse(req.query), { skip, take: pageSize });
    return { data, meta: { page, pageSize, total } };
};

export const financeRouter = Router();
financeRouter.get('/finance/ledger', permitted('finance.read'), listRoute(listLedgerPage));
financeRouter.get('/finance/ledger/summary', permitted('finance.read'), route(req => getLedgerSummary(ledgerFiltersSchema.parse(req.query))));
financeRouter.get('/payments', permitted('finance.read'), listRoute(listPayments));
financeRouter.post('/payments/import', permitted('finance.refund.approve'), route(req => importPayment(importPaymentSchema.parse(req.body), currentUser(req).id)));
financeRouter.get('/refunds', permitted('finance.read'), listRoute(listRefunds));
financeRouter.post('/refunds', permitted('finance.refund.request'), route(async req => {
    const refund = await requestRefund(refundRequestSchema.parse(req.body), currentUser(req).id);
    void announce('REFUND_REQUESTED', { amount: refund.amount.toFixed(2), currency: refund.currency, link: crmLink('/finance') });
    return refund;
}));
financeRouter.post('/refunds/:id/approve', permitted('finance.refund.approve'), route(req => decideRefund(entityId(req), 'APPROVED', currentUser(req).id)));
financeRouter.post('/refunds/:id/reject', permitted('finance.refund.approve'), route(req => decideRefund(entityId(req), 'REJECTED', currentUser(req).id)));
financeRouter.post('/refunds/:id/process', permitted('finance.refund.approve'), route(req => processRefund(entityId(req), currentUser(req).id)));
financeRouter.post('/refunds/:id/sync', permitted('finance.refund.approve'), route(req => syncRefund(entityId(req), currentUser(req).id)));
financeRouter.get('/finance/events/:id/overview', permitted('finance.read'), route(req => eventFinancialOverview(entityId(req))));

// Inbound provider webhook: unauthenticated by design (Mollie sends only a payment id), so the
// payload is never trusted — state is re-fetched from the provider and receipts are logged.
const receiveMollieWebhook = async (req: Request) => {
    const { id } = z.object({ id: z.string().regex(/^tr_[A-Za-z0-9]{1,40}$/) }).parse(req.body);
    const payment = await refreshPaymentFromProvider(id);
    // Unknown ids are acknowledged but not stored, so the open endpoint cannot be used to fill the table.
    if (!payment) return { received: true };
    const externalEventId = `${id}:${payment.status}`;
    await prisma.inboundWebhook.upsert({
        where: { provider_externalEventId: { provider: 'MOLLIE', externalEventId } },
        create: { provider: 'MOLLIE', externalEventId, payloadHash: createHash('sha256').update(id).digest('hex'), status: 'PROCESSED', processedAt: new Date() },
        update: {},
    });
    return { received: true };
};

export const inboundWebhooksRouter = Router();
inboundWebhooksRouter.post('/mollie', route(receiveMollieWebhook));
