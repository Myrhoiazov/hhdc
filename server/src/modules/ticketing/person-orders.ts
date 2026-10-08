import type { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

// Purchases of one person: every order they placed and every order holding a ticket in their
// name, newest first, with the tickets and payments of each. The address of a ticket file opens
// the ticket for whoever has it, so this is served only to staff who may read tickets.

const TICKET_FIELDS = {
    id: true, ticketType: true, barcode: true, status: true, price: true, listPrice: true, serviceFee: true, couponCode: true, downloadUrl: true, holderPersonId: true,
    event: { select: { id: true, name: true } }, registration: { select: { status: true } },
} as const;

const ORDER_FIELDS = {
    id: true, externalId: true, status: true, currency: true, subtotal: true, fees: true, total: true, orderedAt: true, shopName: true, answers: true, downloadUrl: true, buyerPersonId: true,
    event: { select: { id: true, name: true } },
    tickets: { select: TICKET_FIELDS, orderBy: { createdAt: 'asc' } },
    payments: { select: { id: true, amount: true, currency: true, status: true, method: true, paidAt: true }, orderBy: { createdAt: 'asc' } },
} as const;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_FIELDS }>;
type TicketRow = OrderRow['tickets'][number];

const amount = (value: Prisma.Decimal | null): string | null => value?.toFixed(2) ?? null;

// Checked in at the door by the CRM (the registration) or by a Weeztix scanner (the ticket).
export const isCheckedIn = (ticket: { status: string; registration: { status: string } | null }): boolean =>
    ticket.status === 'USED' || ticket.registration?.status === 'CHECKED_IN';

const toTicketView = (ticket: TicketRow, personId: string) => ({
    id: ticket.id, ticketType: ticket.ticketType, barcode: ticket.barcode, status: ticket.status, price: amount(ticket.price), listPrice: amount(ticket.listPrice),
    serviceFee: amount(ticket.serviceFee), couponCode: ticket.couponCode, downloadUrl: ticket.downloadUrl, event: ticket.event,
    checkedIn: isCheckedIn(ticket), heldByPerson: ticket.holderPersonId === personId,
});

const toOrderView = (order: OrderRow, personId: string) => ({
    id: order.id, externalId: order.externalId, status: order.status, currency: order.currency, subtotal: amount(order.subtotal), fees: amount(order.fees), total: amount(order.total),
    orderedAt: order.orderedAt, shopName: order.shopName, answers: Array.isArray(order.answers) ? order.answers : [], downloadUrl: order.downloadUrl,
    event: order.event, boughtByPerson: order.buyerPersonId === personId,
    tickets: order.tickets.map(ticket => toTicketView(ticket, personId)),
    payments: order.payments.map(payment => ({ ...payment, amount: amount(payment.amount) })),
});

export const listPersonOrders = async (personId: string) => {
    const orders = await prisma.order.findMany({
        where: { OR: [{ buyerPersonId: personId }, { tickets: { some: { holderPersonId: personId } } }] },
        select: ORDER_FIELDS, orderBy: { orderedAt: 'desc' }, take: 200,
    });
    return orders.map(order => toOrderView(order, personId));
};
