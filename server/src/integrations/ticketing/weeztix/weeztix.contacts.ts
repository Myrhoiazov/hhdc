import { accessHeaders, expectData, expectList, list, record, text, type WeeztixAccess } from './weeztix.json';

// Buyers of Weeztix orders. Weeztix has no list of customers: a buyer exists only inside an order
// (`POST /statistics/search`), so contacts are collected from orders and joined by email.
// Order objects of Weeztix stay inside this file; the rest of the CRM sees WeeztixContact only.

const SEARCH_URL = 'https://api.weeztix.com/statistics/search';
// Weeztix returns at most 1000 orders per request.
const PAGE_SIZE = 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface OrderReadOptions { pageSize?: number; fetchImpl?: typeof fetch }

export interface WeeztixBuyer {
    orderGuid: string; email: string; firstName: string; lastName: string; language: string;
    phone: string; country: string; marketing: boolean | null; orderedAt: string;
}

export interface WeeztixContact {
    email: string; firstName: string; lastName: string; language: string; phone: string; country: string;
    marketing: boolean; marketingAt: string | null; firstOrderAt: string; orderGuids: string[];
}

// Answers to the questions asked at checkout, by the name of the question.
const readAnswers = (order: Record<string, unknown>): Map<string, unknown> => new Map(
    list(order.meta_data)
        .map((item): [string, unknown] => [text(record(record(item).metadata).name), record(item).value])
        .filter(([name]) => name),
);

const answerText = (value: unknown): string => (typeof value === 'number' ? String(value) : text(value));

// Weeztix stores the checkbox as 1/0, sometimes as text. No answer is neither consent nor refusal.
const readMarketing = (value: unknown): boolean | null => {
    const answer = answerText(value);
    if (!answer) return null;
    return answer === '1' || answer === 'true';
};

export const toBuyer = (source: unknown): WeeztixBuyer | null => {
    const order = record(source);
    const email = text(order.email).toLowerCase();
    if (!EMAIL.test(email)) return null;
    const answers = readAnswers(order);
    return {
        orderGuid: text(order.guid), email, firstName: text(order.firstName), lastName: text(order.lastName),
        language: text(order.locale).slice(0, 2).toLowerCase(),
        phone: answerText(answers.get('phonenumber')), country: answerText(answers.get('country')),
        marketing: readMarketing(answers.get('keep_me_informed')), orderedAt: text(order.created_at),
    };
};

const time = (iso: string): number => new Date(iso).getTime() || 0;
const firstFilled = (buyers: WeeztixBuyer[], field: 'firstName' | 'lastName' | 'language' | 'phone' | 'country'): string =>
    buyers.find(buyer => buyer[field])?.[field] ?? '';

// One person can buy several times: the newest order wins for each detail it has, the earliest
// order dates the contact, and consent counts when it was given in any order.
const mergeBuyers = (email: string, buyers: WeeztixBuyer[]): WeeztixContact => {
    const oldestFirst = [...buyers].sort((a, b) => time(a.orderedAt) - time(b.orderedAt));
    const newestFirst = [...oldestFirst].reverse();
    const consent = oldestFirst.find(buyer => buyer.marketing === true);
    return {
        email, firstName: firstFilled(newestFirst, 'firstName'), lastName: firstFilled(newestFirst, 'lastName'),
        language: firstFilled(newestFirst, 'language'), phone: firstFilled(newestFirst, 'phone'), country: firstFilled(newestFirst, 'country'),
        marketing: Boolean(consent), marketingAt: consent?.orderedAt ?? null,
        firstOrderAt: oldestFirst[0].orderedAt, orderGuids: oldestFirst.map(buyer => buyer.orderGuid),
    };
};

export const collectContacts = (orders: unknown[]): WeeztixContact[] => {
    const byEmail = new Map<string, WeeztixBuyer[]>();
    for (const order of orders) {
        const buyer = toBuyer(order);
        if (buyer) byEmail.set(buyer.email, [...(byEmail.get(buyer.email) ?? []), buyer]);
    }
    return [...byEmail.entries()].map(([email, buyers]) => mergeBuyers(email, buyers));
};

const fetchOrderPage = async (access: WeeztixAccess, paging: { limit: number; offset: number }, fetchImpl: typeof fetch) => {
    const response = await fetchImpl(SEARCH_URL, {
        method: 'POST', headers: { ...accessHeaders(access), 'Content-Type': 'application/json' }, body: JSON.stringify({ search: '', ...paging }),
    });
    const hits = record(record(await expectData(response, 'orders')).hits);
    return { total: Number(hits.total) || 0, orders: expectList(hits.hits, 'orders').map(hit => record(hit)._source) };
};

export const fetchAllOrders = async (access: WeeztixAccess, options: OrderReadOptions = {}): Promise<unknown[]> => {
    const limit = options.pageSize ?? PAGE_SIZE;
    const orders: unknown[] = [];
    for (;;) {
        const page = await fetchOrderPage(access, { limit, offset: orders.length }, options.fetchImpl ?? fetch);
        orders.push(...page.orders);
        if (!page.orders.length || orders.length >= page.total) return orders;
    }
};
