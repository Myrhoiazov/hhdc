import type { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { NEWS_WINDOW_MS } from '../../common/recent';
import { announce, announceLine } from '../telegram-notifications/announce';
import { crmLink } from '../telegram-notifications/crm-link';
import type { NotificationValues } from '../telegram-notifications/notifications.types';

// Every new order is told to the chat on its own: who bought what, for which event.
//
// An order is told once, when it is paid, its buyer is known and it was placed within the last
// day. Each order remembers that it was told, so nothing is said twice and an order whose buyer
// is found on a later run is still told. Orders read from the history of the shop are older than
// a day and are never told: the chat does not get the details of past buyers. A sync that brings
// many fresh orders at once tells the first few and then only how many more there are.

export const ORDERS_TOLD = 10;

const SOLD_ORDER = {
    id: true, subtotal: true, currency: true,
    event: { select: { name: true } }, buyer: { select: { id: true, displayName: true, email: true, country: true } },
    items: { select: { name: true, quantity: true }, orderBy: { name: 'asc' as const } },
} as const;

export interface SoldOrder {
    subtotal: { toFixed(digits: number): string }; currency: string; event: { name: string } | null;
    buyer: { id: string; displayName: string; email: string | null; country: string | null } | null;
    items: { name: string; quantity: number }[];
}

// "2 × Full Pass, 1 × Day Pass"
export const ticketsLine = (items: SoldOrder['items']): string => items.map(item => `${item.quantity} × ${item.name}`).join(', ');

export const saleValues = (order: SoldOrder, env?: NodeJS.ProcessEnv): NotificationValues => ({
    tickets: ticketsLine(order.items), event: order.event?.name ?? '', name: order.buyer?.displayName ?? '', email: order.buyer?.email ?? '',
    country: order.buyer?.country ?? '', amount: order.subtotal.toFixed(2), currency: order.currency.trim(),
    link: crmLink(order.buyer ? `/people/${order.buyer.id}` : '/events', env),
});

export const moreOrdersLine = (more: number): string => `🎟 …and ${more} more new orders`;

// Which orders are news right now: paid, with a known buyer, placed within the last day, not told yet.
export const untoldOrders = (connectionId: string, now: Date = new Date()): Prisma.OrderWhereInput => ({
    providerConnectionId: connectionId, announcedAt: null, status: 'PAID', buyerPersonId: { not: null },
    orderedAt: { gte: new Date(now.getTime() - NEWS_WINDOW_MS) },
});

// Tells the chat about the orders that became news, oldest first, and returns how many messages went out.
// The orders are marked before anything is sent: a message Telegram did not take is not sent again later.
export const announceNewSales = async (connectionId: string): Promise<number> => {
    const fresh = await prisma.order.findMany({ where: untoldOrders(connectionId), select: SOLD_ORDER, orderBy: { orderedAt: 'asc' } });
    if (!fresh.length) return 0;
    await prisma.order.updateMany({ where: { id: { in: fresh.map(order => order.id) } }, data: { announcedAt: new Date() } });
    let told = 0;
    for (const order of fresh.slice(0, ORDERS_TOLD)) told += await announce('NEW_TICKET_SALES', saleValues(order)) ? 1 : 0;
    if (fresh.length > ORDERS_TOLD) await announceLine('NEW_TICKET_SALES', moreOrdersLine(fresh.length - ORDERS_TOLD));
    return told;
};
