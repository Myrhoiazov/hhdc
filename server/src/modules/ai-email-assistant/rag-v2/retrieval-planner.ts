import type { IntentV2, QueryEntities, QueryUnderstanding, RagLanguage } from './rag-v2.types';

// Pure: QueryUnderstanding → which slice of each knowledge layer to search. The retriever applies
// these as metadata filters BEFORE semantic ranking, so e.g. a Rotterdam question can never be
// answered from an Amsterdam fact just because the two chunks embed similarly.

export interface FactTarget {
    category: string;
    topic?: string;
    city?: string;
    style?: string;
    documentIds?: string[];
}

export interface RetrievalLimits {
    rules: number;
    facts: number;
    faq: number;
    examples: number;
}

export interface RetrievalPlan {
    // preferredSections: rule sections that must win ties (e.g. "availability" when the customer
    // asks whether a place is free).
    rules: { topics: string[]; preferredSections: string[]; excludedSections: string[] };
    facts: FactTarget[];
    faq: { topics: string[]; city?: string };
    examples: { topics: string[]; subtopic: string | null; language: RagLanguage };
    limits: RetrievalLimits;
}

const CAMP_DOCUMENTS: Record<string, string[]> = {
    price: ['camp_pricing'], transport: ['camp_pricing'], booking: ['camp_booking'],
    safety: ['camp_parents_and_safety'], general: ['camp_overview', 'camp_included'],
};

const withCity = (category: string, entities: QueryEntities): FactTarget => (entities.city ? { category, city: entities.city } : { category });

type FactBuilder = (entities: QueryEntities) => FactTarget[];

const FACT_TARGETS: Record<IntentV2, FactBuilder> = {
    registration: (entities) => [withCity('location', entities), withCity('schedule', entities), { category: 'registration' }],
    schedule: (entities) => [withCity('schedule', entities), withCity('location', entities)],
    location: (entities) => [withCity('location', entities)],
    pricing: () => [{ category: 'pricing' }, { category: 'class', topic: 'trial' }],
    payment: () => [{ category: 'pricing' }],
    subscription: () => [{ category: 'pricing' }],
    cancellation: () => [{ category: 'pricing' }],
    trial: () => [{ category: 'class', topic: 'trial' }, { category: 'pricing' }],
    dance_style: (entities) => [entities.style ? { category: 'style', style: entities.style } : { category: 'style' }],
    age_group: (entities) => [{ category: 'class', topic: 'age_group' }, withCity('schedule', entities)],
    beginner: () => [{ category: 'class', topic: 'beginner' }, { category: 'class', topic: 'trial' }],
    clothing: (entities) => [{ category: 'class', topic: 'clothing' }, ...(entities.style ? [{ category: 'style', style: entities.style }] : [])],
    camp: (entities) => [{ category: 'camp', documentIds: CAMP_DOCUMENTS[entities.campTopic ?? 'general'] ?? CAMP_DOCUMENTS.general }],
    parent_question: () => [],
    complaint: () => [],
    other: () => [],
};

// Entities add facts on their own: a known city+age (or style) always deserves the matching
// schedule / style card, whatever the headline intent was.
const entityFactTargets = (understanding: QueryUnderstanding): FactTarget[] => {
    const { entities } = understanding;
    const targets: FactTarget[] = [];
    if (entities.city && (entities.age !== null || understanding.asksAvailability)) targets.push({ category: 'schedule', city: entities.city });
    if (entities.style) targets.push({ category: 'style', style: entities.style });
    return targets;
};

const targetKey = (target: FactTarget) => JSON.stringify([target.category, target.topic, target.city, target.style, target.documentIds]);

const uniqueTargets = (targets: FactTarget[]): FactTarget[] => {
    const seen = new Set<string>();
    return targets.filter((target) => {
        const key = targetKey(target);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const RULE_TOPICS: Partial<Record<IntentV2, string[]>> = {
    registration: ['registration', 'schedule'], schedule: ['schedule'], location: ['schedule'], age_group: ['schedule'],
    dance_style: ['schedule'], trial: ['registration'], beginner: ['registration'], pricing: ['payment'],
    payment: ['payment', 'escalation'], subscription: ['payment', 'escalation'], cancellation: ['payment', 'escalation'],
    complaint: ['escalation'], camp: ['escalation'], parent_question: ['escalation'],
};

const FAQ_TOPICS: Partial<Record<IntentV2, string[]>> = {
    schedule: ['schedule'], location: ['location'], pricing: ['payment', 'trial'], payment: ['payment'],
    subscription: ['cancellation', 'payment'], cancellation: ['cancellation'], trial: ['trial'], beginner: ['trial'],
    clothing: ['clothing'], parent_question: ['parent_question'],
};

const AUDIENCE_FAQ: Record<string, string> = { teenager_location: 'teenagers', teenager_group: 'teenagers', child_group: 'children' };

const EXAMPLE_TOPICS: Partial<Record<IntentV2, string>> = {
    registration: 'registration', location: 'registration', schedule: 'schedule', age_group: 'schedule',
    trial: 'trial', beginner: 'trial', payment: 'payment', complaint: 'complaint',
};

// schedule-rules.md has one section per "what do we know" situation; only the one matching the
// extracted entities is relevant ("age known, city unknown → ask the city" would mislead the model
// when the customer already named Rotterdam).
const SITUATION_SECTIONS = ['city_age_known', 'city_known_age_unknown', 'age_known_city_unknown'];

const situationSection = (entities: QueryEntities): string | undefined => {
    if (entities.city && entities.age !== null) return 'city_age_known';
    if (entities.city) return 'city_known_age_unknown';
    return entities.age !== null ? 'age_known_city_unknown' : undefined;
};

const unique = (values: Array<string | undefined>): string[] => Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const collect = <T>(intents: IntentV2[], table: Partial<Record<IntentV2, T[]>>): T[] => intents.flatMap((intent) => table[intent] ?? []);

// The camp has its own prices/booking terms: when the camp is the topic, "how much / pay"
// secondary intents must not pull regular-lesson pricing facts next to the camp facts.
const CAMP_EXCLUSIVE_INTENTS: readonly IntentV2[] = ['pricing', 'payment', 'subscription', 'trial'];

const factIntents = (understanding: QueryUnderstanding): IntentV2[] => {
    const secondary = understanding.intent === 'camp'
        ? understanding.secondaryIntents.filter((intent) => !CAMP_EXCLUSIVE_INTENTS.includes(intent))
        : understanding.secondaryIntents;
    return [understanding.intent, ...secondary];
};

export const buildRetrievalPlan = (understanding: QueryUnderstanding, limits: RetrievalLimits): RetrievalPlan => {
    const intents = [understanding.intent, ...understanding.secondaryIntents];
    const facts = understanding.needsCurrentFacts ? uniqueTargets([...factIntents(understanding).flatMap((intent) => FACT_TARGETS[intent](understanding.entities)), ...entityFactTargets(understanding)]) : [];
    return {
        rules: {
            topics: unique(['general', ...collect(intents, RULE_TOPICS), understanding.asksAvailability ? 'schedule' : undefined]),
            preferredSections: unique([understanding.needsCurrentFacts ? 'never_invent' : undefined, understanding.asksAvailability ? 'availability' : undefined, situationSection(understanding.entities)]),
            excludedSections: SITUATION_SECTIONS.filter((section) => section !== situationSection(understanding.entities)),
        },
        facts,
        faq: { topics: unique([...collect(intents, FAQ_TOPICS), AUDIENCE_FAQ[understanding.subintent ?? '']]), ...(understanding.entities.city ? { city: understanding.entities.city } : {}) },
        examples: { topics: understanding.needsExamples ? unique(intents.map((intent) => EXAMPLE_TOPICS[intent])) : [], subtopic: understanding.subintent, language: understanding.language },
        limits,
    };
};
