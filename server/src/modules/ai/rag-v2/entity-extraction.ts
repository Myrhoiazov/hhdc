import { findFirstAlias } from '../../knowledge/kb-v2';
import { TICKET_PRODUCTS } from './intent-keywords';
import type { QueryEntities } from './rag-v2.types';

// Only retrieval-relevant entities are extracted — no names, contact data or other personal
// attributes, and nothing here leaves the local pipeline.

const YEAR_PATTERN = /(?:^|[^\d])(20[2-4]\d)(?!\d)/g;
// "HHDC27", "#hhdc26": the edition written as a two-digit suffix.
const EDITION_PATTERN = /hhdc\s?'?(\d{2})(?!\d)/i;

// The first year the customer names decides the edition; a price list such as "June 2026 – May
// 2027" inside a quoted email is not a concern here because quoted lines are stripped earlier.
export const extractEventYear = (text: string): number | null => {
    const edition = EDITION_PATTERN.exec(text);
    if (edition) return 2000 + Number(edition[1]);
    const match = YEAR_PATTERN.exec(text);
    YEAR_PATTERN.lastIndex = 0;
    return match ? Number(match[1]) : null;
};

export const extractEntities = (text: string): QueryEntities => ({
    eventYear: extractEventYear(text),
    ticketProduct: findFirstAlias(text, TICKET_PRODUCTS) ?? null,
});
