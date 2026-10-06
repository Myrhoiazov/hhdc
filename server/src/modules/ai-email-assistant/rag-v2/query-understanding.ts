import { findAliases, findFirstAlias, STYLE_ALIASES } from '../../knowledge-ingestion';
import type { EmailClassification } from '../email-assistant.service';
import { extractEntities } from './entity-extraction';
import { AUDIENCE_KEYWORDS, AVAILABILITY_KEYWORDS, INTENT_KEYWORDS } from './intent-keywords';
import type { IntentV2, QueryEntities, QueryUnderstanding, RagLanguage } from './rag-v2.types';

// Deterministic layer on top of the unchanged LLM classification: the LLM still decides spam /
// needsReply / language / coarse intent; this module refines intent, derives a subintent and
// extracts retrieval entities — no extra model call, same output for the same email.

export interface QueryUnderstandingInput {
    subject: string;
    body: string;
    classification: Pick<EmailClassification, 'language' | 'intent' | 'needsReply'>;
}

const V1_INTENT_MAP: Record<EmailClassification['intent'], IntentV2> = {
    trial_lesson: 'trial', schedule: 'schedule', pricing: 'pricing', subscription: 'subscription',
    payment: 'payment', cancellation: 'cancellation', location: 'location', registration: 'registration',
    complaint: 'complaint', teacher: 'other', event: 'other', partnership: 'other', other: 'other',
};

const MAX_SECONDARY_INTENTS = 2;
const TEEN_AGE = { min: 12, max: 17 };
const TEACHER_WORDS = /преподават|тренер|хореограф|викладач|docent|leraar|juf|teacher|coach|instructor/;
const DUTCH_WORDS = /\b(de|het|een|ik|wij|jullie|niet|voor|graag|hoe|waar|wat|les|lessen|mijn|zijn)\b/g;

// Only used when the LLM returned "unknown": Ukrainian-only letters → uk, other Cyrillic → ru,
// two or more common Dutch function words → nl, otherwise en.
export const detectLanguage = (text: string): RagLanguage => {
    if (/[іїєґ]/i.test(text)) return 'uk';
    if (/[а-яё]/i.test(text)) return 'ru';
    if ((text.toLowerCase().match(DUTCH_WORDS) ?? []).length >= 2) return 'nl';
    return text.trim() ? 'en' : 'unknown';
};

const resolveLanguage = (language: EmailClassification['language'], text: string): RagLanguage => {
    if (language === 'ua') return 'uk';
    return language === 'unknown' ? detectLanguage(text) : language;
};

// A bare style mention ("хочу на хип хоп") is a dance_style question; a bare "is there a free
// place?" is a schedule question (the availability rule lives in the schedule rules).
const detectKeywordIntents = (text: string, asksAvailability: boolean): IntentV2[] => {
    const intents = findAliases(text, INTENT_KEYWORDS) as IntentV2[];
    if (!intents.length && findFirstAlias(text, STYLE_ALIASES)) return ['dance_style'];
    return asksAvailability && !intents.includes('schedule') ? [...intents, 'schedule'] : intents;
};

// The camp is a distinct product (own prices/dates) — a camp mention always routes there so a
// "how much is LITO" question can never pull regular-lesson pricing. Otherwise the LLM intent
// wins, and keywords only fill in when the LLM had nothing specific.
const selectPrimaryIntent = (mapped: IntentV2, keywordIntents: IntentV2[]): IntentV2 => {
    if (keywordIntents.includes('camp')) return 'camp';
    if (mapped !== 'other') return mapped;
    return keywordIntents[0] ?? 'other';
};

type Audience = 'teen' | 'child' | null;

const detectAudience = (text: string, age: number | null): Audience => {
    if (age !== null) return age >= TEEN_AGE.min && age <= TEEN_AGE.max ? 'teen' : age < TEEN_AGE.min ? 'child' : null;
    return (findFirstAlias(text, AUDIENCE_KEYWORDS) as Audience | undefined) ?? null;
};

interface SubintentContext {
    intent: IntentV2;
    intents: IntentV2[];
    entities: QueryEntities;
    audience: Audience;
    asksAvailability: boolean;
    text: string;
}

// First matching rule wins; subintents line up with response-example subtopics where one exists.
const SUBINTENT_RULES: Array<[string, (context: SubintentContext) => boolean]> = [
    ['availability', (context) => context.asksAvailability],
    ['teacher_attention', (context) => context.intent === 'complaint' && TEACHER_WORDS.test(context.text)],
    ['payment_problem', (context) => context.entities.paymentTopic === 'payment_failed' || context.entities.paymentTopic === 'refund'],
    ['teenager_location', (context) => context.audience === 'teen' && Boolean(context.entities.city) && context.intents.some((intent) => intent === 'location' || intent === 'registration')],
    ['location_question', (context) => context.intents.includes('location')],
    ['beginner', (context) => context.intents.includes('beginner') && context.intents.some((intent) => intent === 'trial' || intent === 'registration')],
    ['trial_price', (context) => context.intents.includes('trial') && context.intents.includes('pricing')],
    ['ask_age', (context) => context.intent === 'schedule' && context.audience === null],
    ['teenager_group', (context) => context.audience === 'teen'],
    ['child_group', (context) => context.audience === 'child'],
];

const deriveSubintent = (context: SubintentContext): string | null => SUBINTENT_RULES.find(([, matches]) => matches(context))?.[0] ?? null;

const FACT_FREE_INTENTS: readonly IntentV2[] = ['complaint', 'other'];

export const understandQuery = (input: QueryUnderstandingInput): QueryUnderstanding => {
    const text = `${input.subject}\n${input.body}`;
    const asksAvailability = findAliases(text, AVAILABILITY_KEYWORDS).length > 0;
    const keywordIntents = detectKeywordIntents(text, asksAvailability);
    const intent = selectPrimaryIntent(V1_INTENT_MAP[input.classification.intent] ?? 'other', keywordIntents);
    const secondaryIntents = keywordIntents.filter((candidate) => candidate !== intent).slice(0, MAX_SECONDARY_INTENTS);
    const intents = [intent, ...secondaryIntents];
    const entities = extractEntities(text, intents);
    const audience = detectAudience(text, entities.age);
    return {
        language: resolveLanguage(input.classification.language, text),
        intent,
        subintent: deriveSubintent({ intent, intents, entities, audience, asksAvailability, text: text.toLowerCase() }),
        secondaryIntents,
        needsReply: input.classification.needsReply,
        entities,
        asksAvailability,
        needsCurrentFacts: !FACT_FREE_INTENTS.includes(intent) || secondaryIntents.some((candidate) => !FACT_FREE_INTENTS.includes(candidate)),
        needsBusinessRules: true,
        needsExamples: intent !== 'other',
    };
};
