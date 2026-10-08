import type { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { countryCode } from './countries';

// Money of the events for the dashboard: what each event earned from tickets and what was spent
// on it, grouped by the year the event took place, and where the buyers come from.
// Income is the price of tickets that still let their holder in; the service fee of the ticket
// shop is not income of the organiser. Costs are the expenses entered on the event, the
// expenses recorded for its choreographers and the fees agreed with them; a cancelled expense
// is not counted.

export interface EventSale { eventId: string; tickets: number; revenue: number; listValue: number }
export interface EventCost { eventId: string; amount: number }
export interface EventInfo { id: string; name: string; startAt: Date }
export interface EventMoney { id: string; name: string; startAt: string; tickets: number; revenue: string; discount: string; costs: string; result: string }
export interface YearMoney { year: number; events: EventMoney[]; tickets: number; revenue: string; discount: string; costs: string; result: string }
export interface CountryRow { code: string; buyers: number; tickets: number; revenue: string }
export interface BuyerTicket { holderId: string | null; country: string | null; revenue: number }
export interface CountrySummary { countries: CountryRow[]; notGiven: number; notRecognised: number }

const CENTS = 100;
export const toCents = (amount: { toString(): string } | null | undefined): number => Math.round(Number(amount?.toString() ?? 0) * CENTS);
const money = (cents: number): string => (cents / CENTS).toFixed(2);
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

interface Totals { tickets: number; revenue: number; discount: number; costs: number }
const asMoney = (totals: Totals) => ({
    tickets: totals.tickets, revenue: money(totals.revenue), discount: money(totals.discount), costs: money(totals.costs), result: money(totals.revenue - totals.costs),
});

const eventTotals = (eventId: string, sales: EventSale[], costs: EventCost[]): Totals => {
    const sale = sales.find(item => item.eventId === eventId);
    return {
        tickets: sale?.tickets ?? 0, revenue: sale?.revenue ?? 0, discount: Math.max(0, (sale?.listValue ?? 0) - (sale?.revenue ?? 0)),
        costs: sum(costs.filter(cost => cost.eventId === eventId).map(cost => cost.amount)),
    };
};

const addTotals = (all: Totals[]): Totals => ({
    tickets: sum(all.map(item => item.tickets)), revenue: sum(all.map(item => item.revenue)), discount: sum(all.map(item => item.discount)), costs: sum(all.map(item => item.costs)),
});

// Newest year first; inside a year the events run in the order they took place.
export const summariseYears = (events: EventInfo[], sales: EventSale[], costs: EventCost[]): YearMoney[] => {
    const years = [...new Set(events.map(event => event.startAt.getUTCFullYear()))].sort((a, b) => b - a);
    return years.map(year => {
        const ofYear = events.filter(event => event.startAt.getUTCFullYear() === year).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        const totals = ofYear.map(event => eventTotals(event.id, sales, costs));
        return {
            year, ...asMoney(addTotals(totals)),
            events: ofYear.map((event, index) => ({ id: event.id, name: event.name, startAt: event.startAt.toISOString(), ...asMoney(totals[index]) })),
        };
    });
};

interface CountryTally { buyers: Set<string>; tickets: number; revenue: number }

// A buyer is counted once per country, however many tickets they hold. Buyers whose country is
// missing or cannot be read are counted apart instead of being guessed into a country.
export const summariseCountries = (tickets: BuyerTicket[]): CountrySummary => {
    const byCode = new Map<string, CountryTally>();
    const [notGiven, notRecognised] = [new Set<string>(), new Set<string>()];
    for (const ticket of tickets) {
        const holder = ticket.holderId ?? '';
        const code = countryCode(ticket.country);
        if (!code) { (ticket.country?.trim() ? notRecognised : notGiven).add(holder); continue; }
        const tally = byCode.get(code) ?? { buyers: new Set<string>(), tickets: 0, revenue: 0 };
        tally.buyers.add(holder);
        byCode.set(code, { buyers: tally.buyers, tickets: tally.tickets + 1, revenue: tally.revenue + ticket.revenue });
    }
    const countries = [...byCode.entries()].map(([code, tally]) => ({ code, buyers: tally.buyers.size, tickets: tally.tickets, revenue: money(tally.revenue) }));
    return { countries: countries.sort((a, b) => b.buyers - a.buyers || a.code.localeCompare(b.code)), notGiven: notGiven.size, notRecognised: notRecognised.size };
};

const SOLD: Prisma.TicketWhereInput = { status: { in: ['VALID', 'USED'] }, eventId: { not: null } };

const loadSales = async (): Promise<EventSale[]> => {
    const groups = await prisma.ticket.groupBy({ by: ['eventId'], where: SOLD, _count: { _all: true }, _sum: { price: true, listPrice: true } });
    return groups.map(group => ({ eventId: group.eventId as string, tickets: group._count._all, revenue: toCents(group._sum.price), listValue: toCents(group._sum.listPrice) }));
};

const loadCosts = async (): Promise<EventCost[]> => {
    const [expenses, fees, eventExpenses] = await Promise.all([
        prisma.choreographerCost.findMany({ where: { status: { not: 'CANCELLED' } }, select: { amount: true, eventChoreographer: { select: { eventId: true } } } }),
        prisma.choreographerFeeAgreement.findMany({ where: { status: 'AGREED' }, select: { amount: true, assignment: { select: { eventId: true } } } }),
        prisma.eventExpense.findMany({ where: { status: { not: 'CANCELLED' } }, select: { amount: true, eventId: true } }),
    ]);
    return [
        ...expenses.map(expense => ({ eventId: expense.eventChoreographer.eventId, amount: toCents(expense.amount) })),
        ...fees.map(fee => ({ eventId: fee.assignment.eventId, amount: toCents(fee.amount) })),
        ...eventExpenses.map(expense => ({ eventId: expense.eventId, amount: toCents(expense.amount) })),
    ];
};

const loadBuyerTickets = async (): Promise<BuyerTicket[]> => {
    const tickets = await prisma.ticket.findMany({ where: SOLD, select: { price: true, holderPersonId: true, holder: { select: { country: true } } } });
    return tickets.map(ticket => ({ holderId: ticket.holderPersonId, country: ticket.holder?.country ?? null, revenue: toCents(ticket.price) }));
};

export const getDashboardInsights = async () => {
    const [events, sales, costs, buyerTickets] = await Promise.all([
        prisma.event.findMany({ select: { id: true, name: true, startAt: true } }), loadSales(), loadCosts(), loadBuyerTickets(),
    ]);
    const years = summariseYears(events, sales, costs);
    const [revenue, spent] = [sum(sales.map(sale => sale.revenue)), sum(costs.map(cost => cost.amount))];
    return {
        currency: 'EUR',
        totals: { revenue: money(revenue), costs: money(spent), result: money(revenue - spent), tickets: sum(sales.map(sale => sale.tickets)), buyers: new Set(buyerTickets.map(ticket => ticket.holderId)).size, events: events.length },
        years, ...summariseCountries(buyerTickets),
    };
};
