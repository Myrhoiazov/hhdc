import { CITY_ALIASES, STYLE_ALIASES, findFirstAlias } from '../../knowledge-ingestion';
import { CAMP_TOPICS, PAYMENT_TOPICS, SUBSCRIPTION_TOPICS, WEEKDAY_KEYWORDS } from './intent-keywords';
import type { IntentV2, QueryEntities } from './rag-v2.types';

// Only retrieval-relevant entities are extracted — no names, contact data or other personal
// attributes (spec §7), and nothing here is ever sent anywhere but the local pipeline.

const MIN_AGE = 2;
const MAX_AGE = 80;

// Ordered: the first pattern that yields a plausible age wins. Each captures the number only.
// `\b` is ASCII-only without the `u` flag (unavailable on this ES5 target), so Cyrillic word
// edges use explicit look-arounds; `(?![:.]\d)` keeps "is 18:00" from reading as an age.
const NOT_LETTER = '(?![a-zа-яёіїєґ])';
const NUMBER = '(\\d{1,2})(?![:.]\\d)';
const AGE_PATTERNS: RegExp[] = [
    new RegExp(`(?:^|[^a-zа-яёіїєґ])(?:мне|ему|ей|сыну|дочке|дочери|ребенку|ребёнку|мені|йому|їй|сину|доньці|дитині)\\s+${NUMBER}`),
    new RegExp(`\\b${NUMBER}\\s*-?\\s*(?:летн|річн|(?:лет|года|год|років|роки|рік|jaar|years?|yrs?|y/o|yo)${NOT_LETTER})`),
    new RegExp(`\\b(?:i'?m|i am|aged|age|ben|is|leeftijd)\\s+${NUMBER}`),
];

const TIME_PATTERN = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;

export const extractAge = (text: string): number | null => {
    const lowered = text.toLowerCase();
    for (const pattern of AGE_PATTERNS) {
        const value = Number(lowered.match(pattern)?.[1]);
        if (Number.isInteger(value) && value >= MIN_AGE && value <= MAX_AGE) return value;
    }
    return null;
};

export const extractTime = (text: string): string | null => {
    const match = text.match(TIME_PATTERN);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
};

// Topic entities are only meaningful for their own intent family — "сколько стоит" is a camp
// price only when the message is about the camp.
const topicFor = (text: string, table: Parameters<typeof findFirstAlias>[1], active: boolean): string | null => (
    active ? findFirstAlias(text, table) ?? 'general' : null
);

export const extractEntities = (text: string, intents: IntentV2[]): QueryEntities => ({
    city: findFirstAlias(text, CITY_ALIASES) ?? null,
    age: extractAge(text),
    style: findFirstAlias(text, STYLE_ALIASES) ?? null,
    weekday: findFirstAlias(text, WEEKDAY_KEYWORDS) ?? null,
    time: extractTime(text),
    paymentTopic: topicFor(text, PAYMENT_TOPICS, intents.includes('payment')),
    subscriptionTopic: topicFor(text, SUBSCRIPTION_TOPICS, intents.includes('subscription') || intents.includes('cancellation')),
    campTopic: topicFor(text, CAMP_TOPICS, intents.includes('camp')),
});
