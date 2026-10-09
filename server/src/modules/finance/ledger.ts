import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { EXPENSE_CATEGORIES } from './event-expenses';
import { fromCents, toCents } from './refund-rules';
import { dayFilter, optionalFilter } from '../../common/filters';

// Every movement of money the CRM knows, as one list: payments of buyers, refunds and the costs
// of events. The list is put together in memory from the three sources, then filtered, added up
// and cut into pages; with the few thousand rows of a dance camp this stays fast.

export const TICKETS = 'TICKETS';
export const REFUNDS = 'REFUNDS';
export const LEDGER_CATEGORIES = [TICKETS, REFUNDS, ...EXPENSE_CATEGORIES] as const;

export type LedgerKind = 'PAYMENT' | 'REFUND' | 'EXPENSE';
interface Named { id: string; name: string }
export interface LedgerEntry {
    id: string; kind: LedgerKind; category: string; direction: 'IN' | 'OUT'; date: string; amount: string; currency: string; status: string;
    description: string | null; person: Named | null; event: Named | null; counted: boolean;
    // What the buyer paid, when it differs from the income: the ticket shop and the payment method add their fees.
    paidAmount: string | null;
}

const optional = optionalFilter;

export const ledgerFiltersSchema = z.object({
    q: optional(z.string().trim().max(200)), category: optional(z.enum(LEDGER_CATEGORIES)), eventId: optional(z.string().uuid()),
    from: dayFilter, to: dayFilter,
});
export type LedgerFilters = z.infer<typeof ledgerFiltersSchema>;

// Money that came in or went out for good. A failed payment, a refund that is only requested and
// a cancelled expense are listed, but they add nothing to the totals.
const COUNTED: Record<LedgerKind, string[]> = {
    PAYMENT: ['PAID', 'PARTIALLY_REFUNDED'], REFUND: ['COMPLETED'], EXPENSE: ['PLANNED', 'APPROVED', 'PAID'],
};
export const isCounted = (kind: LedgerKind, status: string): boolean => COUNTED[kind].includes(status);

// An expense with a category the CRM does not list (an old one from a choreographer's card) is shown as "other".
export const expenseCategory = (category: string): string => ((EXPENSE_CATEGORIES as readonly string[]).includes(category) ? category : 'OTHER');

const searched = (entry: LedgerEntry): string => [entry.person?.name, entry.event?.name, entry.description].filter(Boolean).join(' ').toLowerCase();

export const matchesLedger = (entry: LedgerEntry, filters: LedgerFilters): boolean => {
    const day = entry.date.slice(0, 10);
    const checks = [
        !filters.category || entry.category === filters.category,
        !filters.eventId || entry.event?.id === filters.eventId,
        !filters.from || day >= filters.from,
        !filters.to || day <= filters.to,
        !filters.q || searched(entry).includes(filters.q.toLowerCase()),
    ];
    return checks.every(Boolean);
};

export const newestFirst = (entries: LedgerEntry[]): LedgerEntry[] => [...entries].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

export interface CategoryTotal { category: string; direction: 'IN' | 'OUT'; operations: number; amount: string }
export interface LedgerSummary { currency: string; income: string; refunds: string; expenses: string; planned: string; result: string; operations: number; byCategory: CategoryTotal[] }

const sumCents = (entries: LedgerEntry[]): number => entries.reduce((sum, entry) => sum + toCents(entry.amount), 0);

const categoryTotals = (counted: LedgerEntry[]): CategoryTotal[] => {
    const groups = new Map<string, LedgerEntry[]>();
    for (const entry of counted) groups.set(entry.category, [...(groups.get(entry.category) ?? []), entry]);
    return [...groups.entries()]
        .map(([category, entries]) => ({ category, direction: entries[0].direction, operations: entries.length, cents: sumCents(entries) }))
        .sort((a, b) => b.cents - a.cents)
        .map(({ cents, ...total }) => ({ ...total, amount: fromCents(cents) }));
};

export const summariseLedger = (entries: LedgerEntry[]): LedgerSummary => {
    const counted = entries.filter(entry => entry.counted);
    const of = (kind: LedgerKind) => sumCents(counted.filter(entry => entry.kind === kind));
    const [income, refunds, expenses] = [of('PAYMENT'), of('REFUND'), of('EXPENSE')];
    // Costs that are recorded but not paid yet: part of the expenses, shown apart.
    const planned = sumCents(counted.filter(entry => entry.kind === 'EXPENSE' && entry.status !== 'PAID'));
    return {
        currency: entries[0]?.currency ?? 'EUR', income: fromCents(income), refunds: fromCents(refunds), expenses: fromCents(expenses), planned: fromCents(planned),
        result: fromCents(income - refunds - expenses), operations: entries.length, byCategory: categoryTotals(counted),
    };
};

interface EntrySource {
    id: string; kind: LedgerKind; category: string; status: string; amount: string | { toFixed(digits: number): string }; currency: string;
    date: Date; description?: string | null; person?: { id: string; displayName: string } | null; event?: Named | null; paidAmount?: string | null;
}

export const toEntry = (source: EntrySource): LedgerEntry => ({
    id: `${source.kind}:${source.id}`, kind: source.kind, category: source.category, direction: source.kind === 'PAYMENT' ? 'IN' : 'OUT',
    date: source.date.toISOString(), amount: typeof source.amount === 'string' ? source.amount : source.amount.toFixed(2), currency: source.currency.trim(), status: source.status,
    description: source.description ?? null, person: source.person ? { id: source.person.id, name: source.person.displayName } : null,
    event: source.event ?? null, counted: isCounted(source.kind, source.status), paidAmount: source.paidAmount ?? null,
});

const PERSON = { select: { id: true, displayName: true } } as const;
const EVENT = { select: { id: true, name: true } } as const;
const ORDER = { select: { status: true, event: EVENT } } as const;

// Weeztix reports a refund on the order, not on the payment: the payment stays "paid". Such a
// payment is shown with the state of its order and adds nothing to the income.
const WITHDRAWN_ORDERS = ['REFUNDED', 'CANCELLED'];
export const paymentState = (paymentStatus: string, orderStatus: string | undefined): string =>
    (orderStatus && WITHDRAWN_ORDERS.includes(orderStatus) ? orderStatus : paymentStatus);

export interface OrderPayment { id: string; orderId: string | null; amountCents: number; counted: boolean }

// One amount cut into parts in proportion to `weights`, so the parts add up to it to the cent:
// each part is what the running total has reached, less what the parts before it took.
export const splitByWeight = (amountCents: number, weights: number[]): number[] => {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) return weights.map(() => 0);
    let [seen, given] = [0, 0];
    return weights.map(weight => {
        seen += weight;
        const part = Math.round(amountCents * (seen / total)) - given;
        given += part;
        return part;
    });
};

// Income is the price of the tickets that still let their holder in — the same figure the
// dashboard shows — without the fees of the ticket shop and of the payment method. A ticket
// that was refunded, cancelled or transferred earns nothing. The income of an order is shared
// between its successful payments by their size; a failed attempt takes no part in it.
export const ticketIncome = (payments: OrderPayment[], ticketValue: Map<string, number>): Map<string, number> => {
    const income = new Map<string, number>(payments.map(payment => [payment.id, payment.amountCents]));
    const byOrder = new Map<string, OrderPayment[]>();
    for (const payment of payments) if (payment.orderId && payment.counted) byOrder.set(payment.orderId, [...(byOrder.get(payment.orderId) ?? []), payment]);
    for (const [orderId, paid] of byOrder) {
        const parts = splitByWeight(ticketValue.get(orderId) ?? 0, paid.map(payment => payment.amountCents));
        paid.forEach((payment, index) => income.set(payment.id, parts[index]));
    }
    return income;
};

const ADMITTING = ['VALID', 'USED'] as const;

const loadTicketValue = async (): Promise<Map<string, number>> => {
    const groups = await prisma.ticket.groupBy({ by: ['orderId'], where: { status: { in: [...ADMITTING] } }, _sum: { price: true } });
    return new Map(groups.map(group => [group.orderId, toCents(group._sum.price ?? 0)]));
};

const loadPayments = async (): Promise<LedgerEntry[]> => {
    const [rows, ticketValue] = await Promise.all([
        prisma.payment.findMany({ select: { id: true, orderId: true, amount: true, currency: true, status: true, method: true, paidAt: true, createdAt: true, person: PERSON, order: ORDER } }),
        loadTicketValue(),
    ]);
    const states = new Map(rows.map(row => [row.id, paymentState(row.status, row.order?.status)]));
    const income = ticketIncome(rows.map(row => ({ id: row.id, orderId: row.orderId, amountCents: toCents(row.amount), counted: isCounted('PAYMENT', states.get(row.id) as string) })), ticketValue);
    return rows.map(row => toEntry({
        ...row, kind: 'PAYMENT', category: TICKETS, status: states.get(row.id) as string, date: row.paidAt ?? row.createdAt, description: row.method, event: row.order?.event,
        amount: fromCents(income.get(row.id) ?? 0), paidAmount: row.amount.toFixed(2),
    }));
};

const loadRefunds = async (): Promise<LedgerEntry[]> => {
    const rows = await prisma.refund.findMany({ select: { id: true, amount: true, currency: true, status: true, reason: true, processedAt: true, createdAt: true, person: PERSON, payment: { select: { order: ORDER } } } });
    return rows.map(row => toEntry({ ...row, kind: 'REFUND', category: REFUNDS, date: row.processedAt ?? row.createdAt, description: row.reason, event: row.payment.order?.event }));
};

const loadEventExpenses = async (): Promise<LedgerEntry[]> => {
    const rows = await prisma.eventExpense.findMany({ select: { id: true, category: true, description: true, amount: true, currency: true, status: true, expenseDate: true, createdAt: true, person: PERSON, event: EVENT } });
    return rows.map(row => toEntry({ ...row, kind: 'EXPENSE', category: expenseCategory(row.category), date: row.expenseDate ?? row.createdAt }));
};

// Expenses and agreed fees kept on the cards of choreographers: counted here once, as on the event.
const loadChoreographerCosts = async (): Promise<LedgerEntry[]> => {
    const assignment = { select: { person: PERSON, event: EVENT } } as const;
    const [costs, fees] = await Promise.all([
        prisma.choreographerCost.findMany({ select: { id: true, type: true, description: true, amount: true, currency: true, status: true, expenseDate: true, createdAt: true, eventChoreographer: assignment } }),
        prisma.choreographerFeeAgreement.findMany({ where: { status: 'AGREED' }, select: { id: true, amount: true, currency: true, agreedAt: true, createdAt: true, assignment } }),
    ]);
    return [
        ...costs.map(cost => toEntry({ ...cost, kind: 'EXPENSE', category: expenseCategory(cost.type), date: cost.expenseDate ?? cost.createdAt, person: cost.eventChoreographer.person, event: cost.eventChoreographer.event })),
        ...fees.map(fee => toEntry({ ...fee, kind: 'EXPENSE', category: 'FEE', status: 'PLANNED', date: fee.agreedAt ?? fee.createdAt, person: fee.assignment.person, event: fee.assignment.event })),
    ];
};

const loadLedger = async (filters: LedgerFilters): Promise<LedgerEntry[]> => {
    const sources = await Promise.all([loadPayments(), loadRefunds(), loadEventExpenses(), loadChoreographerCosts()]);
    return newestFirst(sources.flat().filter(entry => matchesLedger(entry, filters)));
};

export const listLedger = async (filters: LedgerFilters, paging: { skip: number; take: number }) => {
    const entries = await loadLedger(filters);
    return { data: entries.slice(paging.skip, paging.skip + paging.take), total: entries.length };
};

export const getLedgerSummary = async (filters: LedgerFilters): Promise<LedgerSummary> => summariseLedger(await loadLedger(filters));
