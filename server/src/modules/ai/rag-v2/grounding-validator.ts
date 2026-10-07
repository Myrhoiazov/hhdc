import { detectLanguage } from './query-understanding';
import type { RagLanguage } from './rag-v2.types';

// Deterministic post-generation checks (the evidence gate of 00_runtime/pipeline.md). Every
// dynamic value the draft states — price, time, date, address — must literally occur in the
// facts or CRM data that were in the prompt; availability and completed-action claims need a
// confirmation the knowledge base never provides.

export type GroundingWarningCode =
    | 'unsupported_availability' | 'unsupported_action_claim' | 'ungrounded_price' | 'ungrounded_time'
    | 'ungrounded_date' | 'ungrounded_address' | 'language_mismatch' | 'unresolved_placeholder'
    | 'degenerate_repetition';

export interface GroundingWarning {
    code: GroundingWarningCode;
    value?: string;
}

export interface GroundingInput {
    draft: string;
    factsText: string;
    language: RagLanguage;
    // Reserved for live ticketing availability; nothing supplies it yet.
    availabilityConfirmed?: boolean;
}

export interface GroundingResult {
    ok: boolean;
    warnings: GroundingWarning[];
}

const PRICE_PATTERN = /(?:€\s?|eur(?:o)?\s)(\d{1,3}(?:[ . ]\d{3})+|\d+)(?:[.,](\d{1,2}))?|(\d{1,3}(?:[ . ]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s?(?:€|eur\b|euro|евро|євро)/gi;
const TIME_PATTERN = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g;
const POSTCODE_PATTERN = /\b(\d{4})\s?([A-Z]{2})\b/g;
const STREET_PATTERN = /\b([A-Z][a-zà-ÿ]+(?:straat|weg|laan|plein|hof|kade|gracht|singel|dijk|park|steeg|markt))\s+(\d+[a-z]?)\b/g;
const NUMERIC_DATE_PATTERN = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;
const MONTH_DATE_PATTERN = new RegExp(`(\\d{1,2})\\s+(${[
    'январ', 'феврал', 'март', 'апрел', 'ма[яй]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр',
    'січн', 'лют', 'берез', 'квіт', 'травн', 'червн', 'липн', 'серпн', 'вересн', 'жовтн', 'листопад', 'грудн',
    'januar[iy]', 'februar[iy]', 'maart', 'march', 'april', 'mei', 'may', 'juni', 'june', 'juli', 'july', 'august(?:us)?', 'augustus',
    'september', 'o[ck]tober', 'november', 'december',
].join('|')})[a-zа-яёіїєґ]*`, 'gi');
const PLACEHOLDER_PATTERN = /\[[^\]\n]{2,40}\]/g;

// Strong "there is a place / you are booked" claims in RU/UK/NL/EN. Regexes, not phrases, so
// words in between ("место в группе ещё есть", "there are still spots") are covered too.
const AVAILABILITY_CLAIMS: RegExp[] = [
    /мест[оа](?:\s+в\s+групп[еаі])?\s+(?:ещ[её]\s+|ще\s+)?(?:есть|є)/,
    /(?:есть|є)\s+(?:ещ[её]\s+|ще\s+)?(?:свободн|вільн|мест|місц)/,
    /(?:вы|ви|вас|ребенок|дитина)\s+(?:уже\s+|вже\s+)?(?:записан|записали|зарахован)/,
    /(?:запись|запис|бронь|место)\s+(?:подтвержден|підтверджен|за\s+вами)/,
    /(?:plek|plaats|plekken|plaatsen)\s+(?:is\s+|zijn\s+)?(?:nog\s+)?(?:beschikbaar|vrij)/,
    /er\s+(?:is|zijn)\s+(?:nog\s+)?(?:plek|plaats|ruimte)/,
    /(?:je|u)\s+(?:bent|staat)\s+(?:nu\s+)?ingeschreven/,
    /(?:spots?|places?|room|space)\s+(?:is\s+|are\s+)?(?:still\s+)?available/,
    /there\s+(?:is|are)\s+(?:still\s+)?(?:a\s+)?(?:free\s+)?(?:space|room|spots?|places?)/,
    /(?:you\s+are|you're|you\s+have\s+been)\s+(?:now\s+)?(?:booked|registered|enrolled)/,
    /reserved\s+for\s+you/,
];
// "We have refunded / cancelled / transferred …": actions only staff can perform (rubric: no
// false completed-action claim).
const ACTION_CLAIMS: RegExp[] = [
    /(?:has|have)\s+been\s+(?:refunded|cancell?ed|transferred|resent|processed|changed)/,
    /(?:we|i)(?:\s+have|'ve)?\s+(?:refunded|cancell?ed|transferred|resent|processed)/,
    /(?:мы|я)\s+(?:уже\s+)?(?:вернули|отменили|оформили возврат|перенесли|переоформили|отправили повторно)/,
    /(?:возврат|отмена|перенос)\s+(?:уже\s+)?(?:оформлен|выполнен|произведен|одобрен)/,
    /(?:ми|я)\s+(?:вже\s+)?(?:повернули|скасували|оформили повернення|переоформили)/,
    /(?:is|zijn|hebben)\s+(?:al\s+)?(?:terugbetaald|geannuleerd|overgezet)/,
];
// A claim preceded by one of these ("если есть свободные места", "whether there is space",
// "не можем подтвердить, что места есть") is a condition or a negation, not a promise.
const CLAIM_QUALIFIERS = /(если|ли|чи|якщо|не|нет|ні|if|whether|not|no|geen|niet|of)\s*[,]?\s*$/;
const CLAIM_LOOKBEHIND_CHARS = 24;

const normalizeText = (value: string) => value.toLowerCase().replace(/[–—−]/g, '-').replace(/\s+/g, ' ');

const matchAll = (pattern: RegExp, text: string): RegExpMatchArray[] => Array.from(text.matchAll(pattern));

const priceValue = (integer: string, fraction?: string) => `${integer.replace(/[ . ]/g, '')}${fraction && fraction !== '00' ? `.${fraction}` : ''}`;
export const extractPrices = (text: string): string[] => matchAll(PRICE_PATTERN, text).map((match) => (match[1] ? priceValue(match[1], match[2]) : priceValue(match[3], match[4])));
export const extractTimes = (text: string): string[] => matchAll(TIME_PATTERN, text).map((match) => `${match[1].padStart(2, '0')}:${match[2]}`);
const extractPostcodes = (text: string) => matchAll(POSTCODE_PATTERN, text).map((match) => `${match[1]}${match[2]}`);
const extractStreets = (text: string) => matchAll(STREET_PATTERN, text).map((match) => `${match[1]} ${match[2]}`.toLowerCase());
const extractDates = (text: string) => [...matchAll(NUMERIC_DATE_PATTERN, text), ...matchAll(MONTH_DATE_PATTERN, text)].map((match) => match[0].toLowerCase());

const ungrounded = (code: GroundingWarningCode, values: string[], known: Set<string>): GroundingWarning[] => (
    Array.from(new Set(values)).filter((value) => !known.has(value)).map((value) => ({ code, value }))
);

const isUnqualifiedClaim = (text: string, match: RegExpMatchArray): boolean => (
    !CLAIM_QUALIFIERS.test(text.slice(Math.max(0, (match.index ?? 0) - CLAIM_LOOKBEHIND_CHARS), match.index))
);

const findClaims = (draft: string, claims: RegExp[]): string[] => {
    const text = normalizeText(draft);
    return claims.flatMap((claim) => {
        const match = text.match(claim);
        return match && isUnqualifiedClaim(text, match) ? [match[0]] : [];
    });
};

export const findAvailabilityClaims = (draft: string): string[] => findClaims(draft, AVAILABILITY_CLAIMS);
export const findActionClaims = (draft: string): string[] => findClaims(draft, ACTION_CLAIMS);

const checkDynamicValues = (draft: string, factsText: string): GroundingWarning[] => {
    const factsNormalized = normalizeText(factsText);
    return [
        ...ungrounded('ungrounded_price', extractPrices(draft), new Set(extractPrices(factsText))),
        ...ungrounded('ungrounded_time', extractTimes(draft), new Set(extractTimes(factsText))),
        ...ungrounded('ungrounded_address', [...extractPostcodes(draft), ...extractStreets(draft)], new Set([...extractPostcodes(factsText), ...extractStreets(factsText)])),
        ...extractDates(draft).filter((date) => !factsNormalized.includes(date)).map((value) => ({ code: 'ungrounded_date' as const, value })),
    ];
};

const checkLanguage = (draft: string, language: RagLanguage): GroundingWarning[] => {
    if (language === 'unknown') return [];
    const detected = detectLanguage(draft);
    return detected === language || detected === 'unknown' ? [] : [{ code: 'language_mismatch', value: detected }];
};

// A small model occasionally loops ("Відповідь: <same line>" ×4); any non-trivial line repeated
// three or more times marks the draft as degenerate.
const MIN_REPEATED_LINE_CHARS = 12;
const MAX_LINE_REPETITIONS = 2;

export const findRepeatedLine = (draft: string): string | null => {
    const counts = new Map<string, number>();
    for (const line of draft.split('\n').map((value) => value.trim()).filter((value) => value.length >= MIN_REPEATED_LINE_CHARS)) {
        const count = (counts.get(line) ?? 0) + 1;
        if (count > MAX_LINE_REPETITIONS) return line.slice(0, 60);
        counts.set(line, count);
    }
    return null;
};

export const validateGrounding = (input: GroundingInput): GroundingResult => {
    const repeated = findRepeatedLine(input.draft);
    const warnings: GroundingWarning[] = [
        ...(input.availabilityConfirmed ? [] : findAvailabilityClaims(input.draft).map((value) => ({ code: 'unsupported_availability' as const, value }))),
        ...findActionClaims(input.draft).map((value) => ({ code: 'unsupported_action_claim' as const, value })),
        ...checkDynamicValues(input.draft, input.factsText),
        ...checkLanguage(input.draft, input.language),
        ...Array.from(new Set(input.draft.match(PLACEHOLDER_PATTERN) ?? [])).map((value) => ({ code: 'unresolved_placeholder' as const, value })),
        ...(repeated ? [{ code: 'degenerate_repetition' as const, value: repeated }] : []),
    ];
    return { ok: warnings.length === 0, warnings };
};

const WARNING_EXPLANATIONS: Record<GroundingWarningCode, string> = {
    unsupported_availability: 'it promised availability or a confirmed registration, which CURRENT FACTS and CRM data do not confirm',
    unsupported_action_claim: 'it said an action was completed, which only the HHDC team can do and confirm',
    ungrounded_price: 'it stated a price that is not in CURRENT FACTS',
    ungrounded_time: 'it stated a time that is not in CURRENT FACTS',
    ungrounded_date: 'it stated a date that is not in CURRENT FACTS',
    ungrounded_address: 'it stated an address that is not in CURRENT FACTS',
    language_mismatch: 'it was not written in the required language',
    unresolved_placeholder: 'it contains a template placeholder in square brackets',
    degenerate_repetition: 'it repeats the same line over and over instead of answering',
};

// One-line correction for the single regeneration attempt.
export const describeWarnings = (warnings: GroundingWarning[]): string => Array.from(new Set(warnings.map((warning) => {
    const explanation = WARNING_EXPLANATIONS[warning.code];
    return warning.value ? `${explanation} ("${warning.value}")` : explanation;
}))).join('; ');
