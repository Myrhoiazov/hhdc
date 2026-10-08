import { Prisma, Refund } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { ExternalPayment, ExternalRefund, PaymentProvider } from '../../integrations/payment/PaymentProvider';
import { MolliePaymentProvider } from '../../integrations/payment/mollie.provider';
import { emitDomainEvent } from '../outbox/outbox.service';
import { assertFeatureEnabled } from '../platform/feature-flags';
import { decryptCredentials } from '../providers/providers.service';
import { summarizeEventFinance } from './finance-summary';
import { assertRefundRequest, assertTransition, fromCents, paymentStatusAfterRefunds, toCents } from './refund-rules';

export const paymentProviderFor = async (connectionId: string | null): Promise<PaymentProvider> => {
    const connection = connectionId ? await prisma.providerConnection.findUnique({ where: { id: connectionId } }) : null;
    if (!connection || connection.type !== 'PAYMENT' || connection.provider !== 'MOLLIE' || connection.status === 'DISABLED') {
        throw new ApiError(409, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Payment has no enabled payment provider');
    }
    return new MolliePaymentProvider(connection.credentialsEncrypted ? decryptCredentials(connection.credentialsEncrypted) : {});
};

const paymentFields = (external: ExternalPayment) => ({
    amount: external.amount, currency: external.currency, status: external.status, method: external.method, paidAt: external.paidAt,
    failedAt: external.status === 'FAILED' ? new Date() : null,
});

export const importPaymentSchema = z.object({
    providerConnectionId: z.string().uuid(), externalId: z.string().trim().min(1).max(100),
    orderId: z.string().uuid().nullable().optional(), personId: z.string().uuid().nullable().optional(),
}).strict();

// Normalizes a provider payment into the CRM domain; the provider call precedes the transaction.
export const importPayment = async (input: z.infer<typeof importPaymentSchema>, actorUserId: string) => {
    const external = await (await paymentProviderFor(input.providerConnectionId)).getPayment(input.externalId);
    const existing = await prisma.payment.findFirst({ where: { providerConnectionId: input.providerConnectionId, externalId: external.externalId } });
    return prisma.$transaction(async tx => {
        const links = { orderId: input.orderId ?? existing?.orderId ?? null, personId: input.personId ?? existing?.personId ?? null };
        const payment = existing
            ? await tx.payment.update({ where: { id: existing.id }, data: { ...paymentFields(external), ...links } })
            : await tx.payment.create({ data: { ...paymentFields(external), ...links, providerConnectionId: input.providerConnectionId, externalId: external.externalId } });
        await tx.auditLog.create({ data: { actorUserId, action: 'PAYMENT_IMPORTED', entityType: 'Payment', entityId: payment.id } });
        return payment;
    });
};

const PAYMENT_TOPICS: Record<string, string> = { PAID: 'payment.paid', FAILED: 'payment.failed' };

// Webhook path: the notification only names a payment; authoritative state is re-fetched.
export const refreshPaymentFromProvider = async (externalId: string) => {
    const payment = await prisma.payment.findFirst({ where: { externalId, providerConnectionId: { not: null } } });
    if (!payment) return null;
    const external = await (await paymentProviderFor(payment.providerConnectionId)).getPayment(externalId);
    if (external.status === payment.status) return payment;
    return prisma.$transaction(async tx => {
        const updated = await tx.payment.update({ where: { id: payment.id }, data: paymentFields(external) });
        const topic = PAYMENT_TOPICS[external.status];
        if (topic) await emitDomainEvent(tx, topic, { paymentId: payment.id, orderId: payment.orderId, personId: payment.personId });
        return updated;
    });
};

export const refundRequestSchema = z.object({
    paymentId: z.string().uuid(), amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), reason: z.string().trim().min(3).max(1000),
}).strict();

export const requestRefund = async (input: z.infer<typeof refundRequestSchema>, actorUserId: string) => prisma.$transaction(async tx => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { refunds: true } });
    if (!payment) throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    assertRefundRequest({ paymentStatus: payment.status, paymentAmount: payment.amount, refunds: payment.refunds, amount: input.amount });
    const refund = await tx.refund.create({ data: {
        paymentId: payment.id, orderId: payment.orderId, personId: payment.personId, currency: payment.currency,
        amount: fromCents(toCents(input.amount)), reason: input.reason, requestedBy: actorUserId,
    } });
    await tx.auditLog.create({ data: { actorUserId, action: 'REFUND_REQUESTED', entityType: 'Refund', entityId: refund.id, after: { amount: refund.amount.toString() } } });
    return refund;
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const requireRefund = async (id: string) => {
    const refund = await prisma.refund.findUnique({ where: { id }, include: { payment: true } });
    if (!refund) throw new ApiError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    return refund;
};

export const decideRefund = async (id: string, decision: 'APPROVED' | 'REJECTED', actorUserId: string) => {
    const refund = await requireRefund(id);
    assertTransition(refund.status, decision);
    return prisma.$transaction(async tx => {
        const claimed = await tx.refund.updateMany({ where: { id, status: refund.status }, data: { status: decision, approvedBy: decision === 'APPROVED' ? actorUserId : null } });
        if (!claimed.count) throw new ApiError(409, 'REFUND_CHANGED', 'Refund was changed by someone else; refresh and retry');
        await tx.auditLog.create({ data: { actorUserId, action: `REFUND_${decision}`, entityType: 'Refund', entityId: id, before: { status: refund.status }, after: { status: decision } } });
        return tx.refund.findUniqueOrThrow({ where: { id } });
    });
};

const applyProviderResult = async (refund: Refund, external: ExternalRefund, actorUserId: string | null) => prisma.$transaction(async tx => {
    const done = external.status !== 'PROCESSING';
    const updated = await tx.refund.update({ where: { id: refund.id }, data: { status: external.status, providerExternalId: external.externalId, error: null, processedAt: done ? new Date() : null } });
    if (external.status === 'COMPLETED') {
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId }, include: { refunds: true } });
        await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatusAfterRefunds(payment.amount, payment.refunds) } });
        await emitDomainEvent(tx, 'refund.completed', { refundId: refund.id, paymentId: refund.paymentId, orderId: refund.orderId, personId: refund.personId });
    }
    await tx.auditLog.create({ data: { actorUserId, action: 'REFUND_EXECUTED', entityType: 'Refund', entityId: refund.id, after: { status: external.status, providerExternalId: external.externalId } } });
    return updated;
});

// Executes an approved refund at the provider. The claim (APPROVED/FAILED → PROCESSING) makes
// concurrent requests safe; the refund id doubles as the provider idempotency key.
export const processRefund = async (id: string, actorUserId: string) => {
    await assertFeatureEnabled('refund_execution');
    const refund = await requireRefund(id);
    assertTransition(refund.status, 'PROCESSING');
    if (!refund.payment.externalId) throw new ApiError(409, 'PAYMENT_NOT_LINKED', 'Payment has no provider reference');
    const provider = await paymentProviderFor(refund.payment.providerConnectionId);
    const claimed = await prisma.refund.updateMany({ where: { id, status: refund.status }, data: { status: 'PROCESSING' } });
    if (!claimed.count) throw new ApiError(409, 'REFUND_ALREADY_PROCESSING', 'Refund is already being processed');
    let external: ExternalRefund;
    try {
        external = await provider.createRefund({ paymentExternalId: refund.payment.externalId, amount: refund.amount.toFixed(2), currency: refund.currency, description: refund.reason.slice(0, 140), idempotencyKey: refund.id });
    } catch {
        // PROCESSING is retained on purpose: the request may have reached the provider.
        await prisma.refund.update({ where: { id }, data: { error: 'Provider did not confirm the refund; sync before retrying' } });
        throw new ApiError(502, 'REFUND_UNCONFIRMED', 'Provider did not confirm the refund; check the provider before retrying');
    }
    return applyProviderResult(refund, external, actorUserId);
};

export const syncRefund = async (id: string, actorUserId: string) => {
    const refund = await requireRefund(id);
    if (refund.status !== 'PROCESSING' || !refund.providerExternalId || !refund.payment.externalId) throw new ApiError(409, 'REFUND_NOT_SYNCABLE', 'Only provider-confirmed processing refunds can be synced');
    const external = await (await paymentProviderFor(refund.payment.providerConnectionId)).getRefund(refund.payment.externalId, refund.providerExternalId);
    return external.status === 'PROCESSING' ? refund : applyProviderResult(refund, external, actorUserId);
};

export const eventFinancialOverview = async (eventId: string) => {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
    if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
    const [orders, refunds, expenses, agreedFees] = await Promise.all([
        prisma.order.findMany({ where: { eventId }, select: { total: true, status: true } }),
        prisma.refund.findMany({ where: { payment: { order: { eventId } } }, select: { amount: true, status: true } }),
        prisma.choreographerCost.findMany({ where: { eventChoreographer: { eventId } }, select: { type: true, amount: true, status: true } }),
        prisma.choreographerFeeAgreement.findMany({ where: { assignment: { eventId }, status: 'AGREED' }, select: { amount: true } }),
    ]);
    // An agreed choreographer fee is a commitment of the event: it enters the overview as an estimated FEE cost.
    const costs = [...expenses, ...agreedFees.map(fee => ({ type: 'FEE', amount: fee.amount, status: 'APPROVED' }))];
    return { event, ...summarizeEventFinance({ orders, refunds, costs }) };
};
