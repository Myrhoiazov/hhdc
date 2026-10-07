import { findAliases } from '../../knowledge/kb-v2';
import type { EmailClassification } from '../email-classification';
import { extractEntities } from './entity-extraction';
import { AVAILABILITY_KEYWORDS, HISTORICAL_KEYWORDS, INTENT_KEYWORDS } from './intent-keywords';
import { INTENT_ROUTES } from './routing';
import type { IntentV2, QueryUnderstanding, RagLanguage } from './rag-v2.types';

// Deterministic layer on top of the classifier: the model decides spam / needsReply / language /
// intent; this module adds keyword intents the model missed, resolves the event year, and applies
// the routing table so that money and action topics always reach the CRM and a person — no extra
// model call, same output for the same email.

export interface QueryUnderstandingInput {
    subject: string;
    body: string;
    classification: EmailClassification;
    currentEventYear: number;
}

const MAX_SECONDARY_INTENTS = 2;
const DUTCH_WORDS = /\b(de|het|een|ik|wij|jullie|niet|voor|graag|hoe|waar|wat|mijn|zijn|wil)\b/g;

// Only used when the classifier returned "unknown": Ukrainian-only letters → uk, other Cyrillic
// → ru, two or more common Dutch function words → nl, otherwise en.
export const detectLanguage = (text: string): RagLanguage => {
    if (/[іїєґ]/i.test(text)) return 'uk';
    if (/[а-яё]/i.test(text)) return 'ru';
    if ((text.toLowerCase().match(DUTCH_WORDS) ?? []).length >= 2) return 'nl';
    return text.trim() ? 'en' : 'unknown';
};

export const currentEventYear = (env: NodeJS.ProcessEnv = process.env): number => {
    const year = Number(env.HHDC_EVENT_YEAR);
    return Number.isInteger(year) && year >= 2000 ? year : 2027;
};

// The classifier's intent wins; keywords only fill in when it had nothing specific.
const primaryIntent = (classified: IntentV2, keywordIntents: IntentV2[]): IntentV2 => (classified !== 'other' ? classified : keywordIntents[0] ?? 'other');

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const understandQuery = (input: QueryUnderstandingInput): QueryUnderstanding => {
    const text = `${input.subject}\n${input.body}`;
    const { classification } = input;
    const keywordIntents = findAliases(text, INTENT_KEYWORDS) as IntentV2[];
    const intent = primaryIntent(classification.intent, keywordIntents);
    const secondaryIntents = unique([...classification.secondaryIntents, ...keywordIntents]).filter(candidate => candidate !== intent).slice(0, MAX_SECONDARY_INTENTS);
    const routes = [intent, ...secondaryIntents].map(candidate => INTENT_ROUTES[candidate]);
    const entities = extractEntities(text);
    const eventYear = entities.eventYear ?? input.currentEventYear;
    const asksAvailability = findAliases(text, AVAILABILITY_KEYWORDS).length > 0;
    return {
        language: classification.replyLanguage === 'unknown' ? detectLanguage(text) : classification.replyLanguage,
        intent,
        secondaryIntents,
        needsReply: classification.needsReply,
        entities,
        eventYear,
        historical: eventYear < input.currentEventYear || (entities.eventYear === null && findAliases(text, HISTORICAL_KEYWORDS).length > 0),
        asksAvailability,
        needsCRM: classification.needsCRM || routes.some(candidate => candidate.crm === 'always'),
        needsKnowledge: classification.needsKnowledge || routes.some(candidate => candidate.facts.length > 0),
        // Availability is live ticketing data nobody but staff can confirm.
        needsHumanAction: classification.needsHumanAction || asksAvailability || routes.some(candidate => candidate.human === 'always'),
        urgency: classification.urgency,
    };
};
