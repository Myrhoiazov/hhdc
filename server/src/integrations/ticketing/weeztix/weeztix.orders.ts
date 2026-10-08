import { centsToAmount } from './weeztix.catalog';
import { list, record, text } from './weeztix.json';

// An order of Weeztix as the CRM stores it: money as amounts, states in the CRM's own words.
// Order objects of Weeztix stay inside this file; the original answer travels in `raw` to be
// stored next to the record, without the buyer's network and location details.

export type OrderState = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type TicketState = 'VALID' | 'USED' | 'CANCELLED' | 'REFUNDED' | 'TRANSFERRED';

export interface WeeztixTicket {
    guid: string; typeGuid: string; number: string; status: TicketState; price: string; listPrice: string; serviceFee: string; couponCode: string | null;
    downloadUrl: string | null; raw: Record<string, unknown>;
}
// What the buyer answered at checkout, by the name of the question.
export interface OrderAnswer { name: string; value: string }
export interface WeeztixPayment { guid: string; amount: string; currency: string; status: string; method: string | null; paidAt: string | null }
export interface WeeztixOrder {
    guid: string; email: string; status: OrderState; currency: string; subtotal: string; fees: string; total: string; orderedAt: string;
    shopGuid: string; answers: OrderAnswer[]; downloadUrl: string | null;
    tickets: WeeztixTicket[]; payments: WeeztixPayment[]; raw: Record<string, unknown>;
}

const without = (source: Record<string, unknown>, fields: string[]): Record<string, unknown> =>
    Object.fromEntries(Object.entries(source).filter(([field]) => !fields.includes(field)));

// The address of a ticket file opens it for whoever holds the address. It is kept in a field of
// its own, shown to staff who may read tickets, and left out of the copy of the answer.
const LINKS = ['pdf_location', 'download_link', 'receipt_link'];

// Only a real https address is kept: Weeztix writes "0" when a file does not exist.
export const downloadUrl = (value: unknown): string | null => {
    try { return new URL(text(value)).protocol === 'https:' ? text(value) : null; } catch { return null; }
};

const answerValue = (value: unknown): string => (typeof value === 'number' || typeof value === 'boolean' ? String(value) : text(value));

export const readAnswers = (order: Record<string, unknown>): OrderAnswer[] => list(order.meta_data)
    .map(item => ({ name: text(record(record(item).metadata).name), value: answerValue(record(item).value) }))
    .filter(answer => answer.name && answer.value);

// Weeztix marks a withdrawn order or ticket with a reason instead of a status.
const REASONS: Array<[string, 'REFUNDED' | 'TRANSFERRED']> = [['return', 'REFUNDED'], ['refund', 'REFUNDED'], ['swap', 'TRANSFERRED']];
const withdrawnAs = (source: Record<string, unknown>): 'REFUNDED' | 'TRANSFERRED' | 'CANCELLED' | null => {
    if (!source.invalidated_since) return null;
    const reason = text(source.invalidated_reason).toLowerCase();
    return REASONS.find(([word]) => reason.includes(word))?.[1] ?? 'CANCELLED';
};

const isScanned = (ticket: Record<string, unknown>): boolean => {
    const parts = list(ticket.products).map(record);
    return parts.length > 0 && parts.every(part => Number(part.scanned_amount) > 0);
};

const couponOf = (ticket: Record<string, unknown>): string | null =>
    list(ticket.products).map(part => text(record(part).coupon_code)).find(Boolean) ?? null;

export const toTicket = (source: unknown): WeeztixTicket | null => {
    const ticket = record(source);
    const [guid, typeGuid] = [text(ticket.guid), text(ticket.ticket_id)];
    if (!guid || !typeGuid) return null;
    return {
        guid, typeGuid, number: text(ticket.ticket_number), status: withdrawnAs(ticket) ?? (isScanned(ticket) ? 'USED' : 'VALID'),
        price: centsToAmount(ticket.finn_value), listPrice: centsToAmount(ticket.finn_original_price), serviceFee: centsToAmount(ticket.finn_service_fee),
        couponCode: couponOf(ticket), downloadUrl: downloadUrl(ticket.download_link),
        raw: without(ticket, ['order', ...LINKS]),
    };
};

const PAYMENT_STATES: Record<string, string> = { paid: 'PAID', pending: 'PENDING', open: 'PENDING', failed: 'FAILED', cancelled: 'CANCELLED', expired: 'EXPIRED' };

export const toPayment = (source: unknown): WeeztixPayment | null => {
    const payment = record(source);
    const guid = text(payment.guid);
    if (!guid) return null;
    const status = PAYMENT_STATES[text(payment.status).toLowerCase()] ?? 'PENDING';
    return {
        guid, amount: centsToAmount(payment.finn_price), currency: text(payment.currency) || 'EUR', status,
        method: text(record(payment.payment_method).name) || null, paidAt: status === 'PAID' ? text(payment.updated_at) || null : null,
    };
};

const orderState = (order: Record<string, unknown>): OrderState => {
    const withdrawn = withdrawnAs(order);
    if (withdrawn) return withdrawn === 'REFUNDED' ? 'REFUNDED' : 'CANCELLED';
    return text(order.status).toLowerCase() === 'paid' ? 'PAID' : 'PENDING';
};

const present = <Item>(item: Item | null): item is Item => item !== null;

export const toOrder = (source: unknown): WeeztixOrder | null => {
    const order = record(source);
    const [guid, orderedAt] = [text(order.guid), text(order.created_at)];
    if (!guid || !orderedAt) return null;
    const payments = list(order.payments).map(toPayment);
    const tickets = list(order.tickets).map(toTicket);
    // An order is stored whole or not at all: a part the CRM cannot read makes the order unreadable.
    if (!payments.every(present) || !tickets.every(present)) return null;
    return {
        guid, email: text(order.email).toLowerCase(), status: orderState(order), currency: payments[0]?.currency ?? 'EUR',
        subtotal: centsToAmount(order.finn_value), fees: centsToAmount(order.finn_service_fee), total: centsToAmount(order.finn_price), orderedAt,
        shopGuid: text(order.shop_id), answers: readAnswers(order), downloadUrl: downloadUrl(order.download_link),
        tickets, payments, raw: { ...without(order, ['tech_data', 'geoable', 'tickets', ...LINKS]), tickets: tickets.map(ticket => ticket.raw) },
    };
};
