import { accessHeaders, expectData, expectList, record, text, type WeeztixAccess } from './weeztix.json';

// What Weeztix sells: events with their location, and the ticket types of each event with prices.
// Event and ticket objects of Weeztix stay inside this file; the CRM sees the two shapes below,
// with the original answer kept in `raw` to be stored next to the record.

const API_URL = 'https://api.weeztix.com';
const CENTS = 100;

export interface CatalogTicketType {
    guid: string; name: string; description: string | null; price: string; vatPercentage: number | null; status: string;
    availableFrom: string | null; availableUntil: string | null; soldCount: number; raw: Record<string, unknown>;
}

export interface CatalogEvent {
    guid: string; name: string; description: string | null; startAt: string; endAt: string; currency: string;
    venueName: string | null; address: string | null; capacity: number | null; ticketTypes: CatalogTicketType[];
}

const optional = (value: unknown): string | null => text(value) || null;
const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

// Weeztix keeps money in cents.
export const centsToAmount = (cents: unknown): string => (count(cents) / CENTS).toFixed(2);

export const toTicketType = (source: unknown): CatalogTicketType | null => {
    const ticket = record(source);
    const guid = text(ticket.guid);
    if (!guid || !text(ticket.name)) return null;
    return {
        guid, name: text(ticket.name), description: optional(ticket.description), price: centsToAmount(ticket.min_price),
        vatPercentage: typeof ticket.vat_percentage === 'number' ? ticket.vat_percentage : null, status: text(ticket.status) || 'unknown',
        availableFrom: optional(ticket.available_from), availableUntil: optional(ticket.available_until), soldCount: count(ticket.sold_count), raw: ticket,
    };
};

// Weeztix uses 0 for "no limit"; the CRM leaves the capacity empty then.
export const toCatalogEvent = (source: unknown, ticketTypes: unknown[] = []): CatalogEvent | null => {
    const event = record(source);
    const [guid, name, startAt, endAt] = [text(event.guid), text(event.name), text(event.start), text(event.end)];
    if (!guid || !name || !startAt || !endAt) return null;
    const location = record(event.location);
    return {
        guid, name, description: optional(event.description), startAt, endAt, currency: text(event.currency) || 'EUR',
        venueName: optional(location.name), address: optional(location.address), capacity: count(event.capacity) || null,
        ticketTypes: ticketTypes.map(toTicketType).filter((ticket): ticket is CatalogTicketType => ticket !== null),
    };
};

const getList = async (access: WeeztixAccess, path: string, fetchImpl: typeof fetch): Promise<unknown[]> => {
    const what = `${path.split('/')[0]} data`;
    return expectList(await expectData(await fetchImpl(`${API_URL}/${path}`, { headers: accessHeaders(access) }), what), what);
};

// `unreadable` counts records Weeztix returned but the CRM could not understand.
export interface Read<Item> { items: Item[]; unreadable: number }

const readEach = async <Item>(sources: unknown[], read: (source: unknown) => Promise<Item | null>): Promise<Read<Item>> => {
    const items: Item[] = [];
    for (const source of sources) {
        const item = await read(source);
        if (item) items.push(item);
    }
    return { items, unreadable: sources.length - items.length };
};

// Events come in one answer; ticket types are asked per event, one request at a time.
export const fetchCatalog = async (access: WeeztixAccess, fetchImpl: typeof fetch = fetch): Promise<Read<CatalogEvent>> =>
    readEach(await getList(access, 'event', fetchImpl), async source => {
        const guid = text(record(source).guid);
        return guid ? toCatalogEvent(source, await getList(access, `event/${encodeURIComponent(guid)}/ticket`, fetchImpl)) : null;
    });

export interface CatalogCoupon {
    guid: string; name: string; description: string | null; type: string; amount: string; status: string;
    startsAt: string | null; endsAt: string | null; codes: string[]; raw: Record<string, unknown>;
}

// A percentage coupon carries whole percents; the other kinds carry money in cents.
const couponAmount = (type: string, amount: unknown): string => (type.includes('percentage') ? count(amount).toFixed(2) : centsToAmount(amount));

export const toCoupon = (source: unknown, codes: unknown[] = []): CatalogCoupon | null => {
    const coupon = record(source);
    const [guid, name, type] = [text(coupon.guid), text(coupon.name), text(coupon.type)];
    if (!guid || !name) return null;
    return {
        guid, name, description: optional(coupon.description), type: type || 'unknown', amount: couponAmount(type, coupon.amount), status: text(coupon.status) || 'unknown',
        startsAt: optional(coupon.start_date), endsAt: optional(coupon.end_date), codes: codes.map(code => text(record(code).code)).filter(Boolean), raw: coupon,
    };
};

// Coupons come in one answer; the codes of each coupon are asked separately.
export const fetchCoupons = async (access: WeeztixAccess, fetchImpl: typeof fetch = fetch): Promise<Read<CatalogCoupon>> =>
    readEach(await getList(access, 'coupon', fetchImpl), async source => {
        const guid = text(record(source).guid);
        return guid ? toCoupon(source, await getList(access, `coupon/${encodeURIComponent(guid)}/codes`, fetchImpl)) : null;
    });

// Names of the ticket shops, by GUID: an order only says which shop it came from.
export const fetchShopNames = async (access: WeeztixAccess, fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> =>
    new Map((await getList(access, 'shop', fetchImpl)).map((shop): [string, string] => [text(record(shop).guid), text(record(shop).name)]).filter(([guid, name]) => guid && name));
