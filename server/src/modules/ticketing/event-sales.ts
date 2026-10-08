import prisma from '../../../prisma/prisma-client';

// Sales of one event, counted from the tickets the CRM holds. A ticket counts while it lets its
// holder in; a cancelled, refunded or transferred ticket is reported separately and earns nothing.
// Amounts are ticket prices: the service fee of the ticketing provider is not part of them.

export interface SoldTicket { status: string; ticketType: string; price: string | null; listPrice: string | null; couponCode: string | null; orderId: string; buyerId: string | null; orderedAt: Date }
export interface SalesLine { name: string; tickets: number; revenue: string }
export interface CouponLine { name: string; tickets: number; discount: string }
export interface EventSales {
    currency: string; tickets: number; withdrawn: number; orders: number; buyers: number; revenue: string; discount: string;
    byType: SalesLine[]; byMonth: SalesLine[]; coupons: CouponLine[];
}

const CENTS = 100;
const ADMISSIBLE = ['VALID', 'USED'];
const cents = (amount: string | null): number => Math.round(Number(amount ?? 0) * CENTS);
const money = (value: number): string => (value / CENTS).toFixed(2);
const discountOf = (ticket: SoldTicket): number => Math.max(0, cents(ticket.listPrice) - cents(ticket.price));

interface Tally { tickets: number; amount: number }

const tally = (tickets: SoldTicket[], key: (ticket: SoldTicket) => string | null, amount: (ticket: SoldTicket) => number): Map<string, Tally> => {
    const groups = new Map<string, Tally>();
    for (const ticket of tickets) {
        const name = key(ticket);
        if (!name) continue;
        const group = groups.get(name) ?? { tickets: 0, amount: 0 };
        groups.set(name, { tickets: group.tickets + 1, amount: group.amount + amount(ticket) });
    }
    return groups;
};

const salesLines = (groups: Map<string, Tally>): SalesLine[] => [...groups.entries()].map(([name, group]) => ({ name, tickets: group.tickets, revenue: money(group.amount) }));
const month = (ticket: SoldTicket): string => ticket.orderedAt.toISOString().slice(0, 7);
const distinct = (values: Array<string | null>): number => new Set(values.filter(Boolean)).size;

// `couponNames` gives the coupon behind a code; a code the CRM has no coupon for is shown as itself.
export const summariseSales = (tickets: SoldTicket[], couponNames: Map<string, string> = new Map(), currency = 'EUR'): EventSales => {
    const sold = tickets.filter(ticket => ADMISSIBLE.includes(ticket.status));
    const coupons = tally(sold, ticket => (ticket.couponCode ? couponNames.get(ticket.couponCode) ?? ticket.couponCode : null), discountOf);
    return {
        currency, tickets: sold.length, withdrawn: tickets.length - sold.length,
        orders: distinct(sold.map(ticket => ticket.orderId)), buyers: distinct(sold.map(ticket => ticket.buyerId)),
        revenue: money(sold.reduce((sum, ticket) => sum + cents(ticket.price), 0)), discount: money(sold.reduce((sum, ticket) => sum + discountOf(ticket), 0)),
        byType: salesLines(tally(sold, ticket => ticket.ticketType, ticket => cents(ticket.price))).sort((a, b) => b.tickets - a.tickets),
        byMonth: salesLines(tally(sold, month, ticket => cents(ticket.price))).sort((a, b) => a.name.localeCompare(b.name)),
        coupons: [...coupons.entries()].map(([name, group]) => ({ name, tickets: group.tickets, discount: money(group.amount) })).sort((a, b) => b.tickets - a.tickets),
    };
};

const loadCouponNames = async (codes: string[]): Promise<Map<string, string>> => {
    const coupons = codes.length ? await prisma.coupon.findMany({ where: { codes: { hasSome: codes } }, select: { name: true, codes: true } }) : [];
    return new Map(coupons.flatMap(coupon => coupon.codes.map((code): [string, string] => [code, coupon.name])));
};

export const getEventSales = async (eventId: string): Promise<EventSales> => {
    const rows = await prisma.ticket.findMany({
        where: { eventId },
        select: { status: true, ticketType: true, price: true, listPrice: true, couponCode: true, orderId: true, order: { select: { buyerPersonId: true, orderedAt: true, currency: true } } },
    });
    const tickets = rows.map((row): SoldTicket => ({
        status: row.status, ticketType: row.ticketType, price: row.price?.toFixed(2) ?? null, listPrice: row.listPrice?.toFixed(2) ?? null,
        couponCode: row.couponCode, orderId: row.orderId, buyerId: row.order.buyerPersonId, orderedAt: row.order.orderedAt,
    }));
    const codes = [...new Set(tickets.flatMap(ticket => (ticket.couponCode ? [ticket.couponCode] : [])))];
    return summariseSales(tickets, await loadCouponNames(codes), rows[0]?.order.currency ?? 'EUR');
};
