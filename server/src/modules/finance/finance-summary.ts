import { fromCents, toCents } from './refund-rules';

type Money = string | number | { toString(): string };
export interface FinanceInput {
    orders: { total: Money; status: string }[];
    refunds: { amount: Money; status: string }[];
    costs: { type: string; amount: Money; status: string }[];
}

const COST_TYPES = ['FEE', 'TRAVEL', 'HOTEL', 'PER_DIEM', 'OTHER'];
const sum = <T,>(items: T[], pick: (item: T) => Money) => items.reduce((total, item) => total + toCents(pick(item)), 0);
const withStatus = <T extends { status: string }>(items: T[], statuses: string[]) => items.filter(item => statuses.includes(item.status));

const costLine = (costs: FinanceInput['costs'], type: string) => {
    const ofType = costs.filter(cost => (COST_TYPES.includes(cost.type) ? cost.type : 'OTHER') === type);
    return { actual: sum(withStatus(ofType, ['PAID']), cost => cost.amount), estimated: sum(withStatus(ofType, ['PLANNED', 'APPROVED']), cost => cost.amount) };
};

const formatLine = (line: Record<string, number>) => Object.fromEntries(Object.entries(line).map(([label, cents]) => [label, fromCents(cents)]));

// Every figure carries its certainty label (actual / pending / estimated); they are never blended silently.
export const summarizeEventFinance = (input: FinanceInput) => {
    const revenue = { actual: sum(withStatus(input.orders, ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']), order => order.total), pending: sum(withStatus(input.orders, ['PENDING']), order => order.total) };
    const refunds = { actual: sum(withStatus(input.refunds, ['COMPLETED']), refund => refund.amount), pending: sum(withStatus(input.refunds, ['REQUESTED', 'APPROVED', 'PROCESSING']), refund => refund.amount) };
    const costs = Object.fromEntries(COST_TYPES.map(type => [type, costLine(input.costs, type)]));
    const totalCosts = Object.values(costs).reduce((total, line) => total + line.actual + line.estimated, 0);
    const net = revenue.actual - refunds.actual;
    return {
        ticketRevenue: formatLine(revenue),
        refunds: formatLine(refunds),
        netTicketRevenue: formatLine({ actual: net }),
        costs: Object.fromEntries(Object.entries(costs).map(([type, line]) => [type, formatLine(line)])),
        estimatedMargin: formatLine({ estimated: net - totalCosts }),
    };
};
