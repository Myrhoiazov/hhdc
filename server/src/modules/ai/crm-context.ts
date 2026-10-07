import prisma from '../../../prisma/prisma-client';
import type { CrmContext } from './email-draft.types';

// CRM context contract (knowledge/hhdc-knowledge-v2/13_crm_contract): only the fields relevant
// to answering the customer, only this customer's records, no internal notes and no raw ids.

const MAX_RECORDS = 5;

interface MoneyLike { toString(): string }

export interface CrmRecords {
    orders: Array<{ externalId: string | null; status: string; currency: string; total: MoneyLike; orderedAt: Date; event: { name: string } | null }>;
    tickets: Array<{ ticketType: string; status: string; event: { name: string } | null }>;
    payments: Array<{ amount: MoneyLike; currency: string; status: string; method: string | null; paidAt: Date | null; refunds: Array<{ amount: MoneyLike; currency: string; status: string }> }>;
    registrations: Array<{ status: string; event: { name: string } }>;
}

const date = (value: Date | null): string | null => (value ? value.toISOString().slice(0, 10) : null);

// Pure projection of the customer's records into what the drafting model may see.
export const toCrmContext = (records: CrmRecords): CrmContext => {
    const data = {
        orders: records.orders.map(order => ({ orderReference: order.externalId, event: order.event?.name ?? null, orderStatus: order.status, total: `${order.total.toString()} ${order.currency}`, createdAt: date(order.orderedAt) })),
        tickets: records.tickets.map(ticket => ({ ticketName: ticket.ticketType, event: ticket.event?.name ?? null, ticketStatus: ticket.status })),
        payments: records.payments.map(payment => ({
            amount: `${payment.amount.toString()} ${payment.currency}`, paymentStatus: payment.status, method: payment.method, paidAt: date(payment.paidAt),
            refunds: payment.refunds.map(refund => ({ refundedAmount: `${refund.amount.toString()} ${refund.currency}`, refundStatus: refund.status })),
        })),
        registrations: records.registrations.map(registration => ({ event: registration.event.name, registrationStatus: registration.status })),
    };
    const found = Object.values(data).some(list => list.length > 0);
    return { found, text: found ? JSON.stringify(data) : '' };
};

const loadRecords = async (personId: string): Promise<CrmRecords> => {
    const [orders, tickets, payments, registrations] = await Promise.all([
        prisma.order.findMany({ where: { buyerPersonId: personId }, orderBy: { orderedAt: 'desc' }, take: MAX_RECORDS, select: { externalId: true, status: true, currency: true, total: true, orderedAt: true, event: { select: { name: true } } } }),
        prisma.ticket.findMany({ where: { holderPersonId: personId }, orderBy: { createdAt: 'desc' }, take: MAX_RECORDS, select: { ticketType: true, status: true, event: { select: { name: true } } } }),
        prisma.payment.findMany({ where: { personId }, orderBy: { createdAt: 'desc' }, take: MAX_RECORDS, select: { amount: true, currency: true, status: true, method: true, paidAt: true, refunds: { select: { amount: true, currency: true, status: true } } } }),
        prisma.registration.findMany({ where: { personId }, orderBy: { createdAt: 'desc' }, take: MAX_RECORDS, select: { status: true, event: { select: { name: true } } } }),
    ]);
    return { orders, tickets, payments, registrations };
};

// The sender's address alone is not identity verification, so this is only ever used to draft a
// reply that a person reviews — never to act.
export const loadCrmContext = async (personId: string): Promise<CrmContext> => toCrmContext(await loadRecords(personId));
