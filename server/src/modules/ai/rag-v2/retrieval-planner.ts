import { INTENT_ROUTES, type FactTarget } from './routing';
import type { IntentV2, QueryUnderstanding, RagLanguage } from './rag-v2.types';

export type { FactTarget } from './routing';

// Pure: QueryUnderstanding → which slice of each knowledge layer to search. The retriever applies
// these as metadata filters BEFORE semantic ranking, so a 2027 question can never be answered
// from a 2026 fact just because the two chunks embed similarly.

export interface RetrievalLimits { rules: number; facts: number; faq: number; examples: number }

export interface RetrievalPlan {
    rules: { preferredIds: string[] };
    facts: FactTarget[];
    // The edition the customer asks about. Facts published for another edition are excluded;
    // facts without a year (generic policies) are always eligible.
    eventYear: number;
    faq: { topics: string[] };
    examples: { topics: string[]; language: RagLanguage };
    limits: RetrievalLimits;
}

const ALWAYS_PREFERRED_RULES = ['assistant_rules', 'forbidden_assumptions'];

const unique = (values: string[]): string[] => Array.from(new Set(values));

const targetKey = (target: FactTarget) => `${target.category}/${target.topic ?? ''}/${target.subtopic ?? ''}/${target.general ? 'general' : ''}`;

const uniqueTargets = (targets: FactTarget[]): FactTarget[] => {
    const seen = new Set<string>();
    return targets.filter(target => !seen.has(targetKey(target)) && Boolean(seen.add(targetKey(target))));
};

// A named ticket product narrows the pricing target to that product's card.
const withProduct = (target: FactTarget, product: string | null): FactTarget => (product && target.category === 'pricing' ? { ...target, subtopic: product } : target);

// The competition has its own fees and rules: when it is the topic, "how much" must not pull
// ticket prices next to it, or a pass price gets quoted as an entry fee.
const COMPETITION_INTENTS: readonly IntentV2[] = ['competition', 'competition_category', 'competition_music'];
const TICKET_INTENTS: readonly IntentV2[] = ['pricing', 'ticket'];

const routedIntents = (understanding: QueryUnderstanding): IntentV2[] => {
    const secondary = COMPETITION_INTENTS.includes(understanding.intent)
        ? understanding.secondaryIntents.filter(intent => !TICKET_INTENTS.includes(intent))
        : understanding.secondaryIntents;
    return [understanding.intent, ...secondary];
};

export const buildRetrievalPlan = (understanding: QueryUnderstanding, limits: RetrievalLimits): RetrievalPlan => {
    const routes = routedIntents(understanding).map(intent => INTENT_ROUTES[intent]);
    const facts = understanding.needsKnowledge ? routes.flatMap(route => route.facts).map(target => withProduct(target, understanding.entities.ticketProduct)) : [];
    return {
        rules: { preferredIds: unique([
            ...routes.flatMap(route => route.rules),
            ...(understanding.historical || understanding.entities.eventYear !== null ? ['year_separation'] : []),
            ...(understanding.needsCRM ? ['status_semantics'] : []),
            ...ALWAYS_PREFERRED_RULES,
        ]) },
        facts: uniqueTargets(facts),
        eventYear: understanding.eventYear,
        faq: { topics: understanding.historical ? [] : unique(routes.flatMap(route => route.faq)) },
        // FAQ and examples are written for the current event; a question about a past edition gets facts only.
        examples: { topics: understanding.historical ? [] : unique(routes.flatMap(route => route.examples)), language: understanding.language },
        limits,
    };
};
