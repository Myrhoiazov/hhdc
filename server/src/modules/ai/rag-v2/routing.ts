import type { IntentV2 } from './rag-v2.types';

// Retrieval routing (knowledge/hhdc-knowledge-v2/14_intent_router/routing-table.md and
// retrieval-recipes.md) as data: which facts answer an intent, whether the customer's own CRM
// records are needed, and whether a person has to act.

// `general` restricts a target to documents without a topic of their own: the event overview,
// not every sub-page filed under the event (venue, Heels Master Stage, …).
export interface FactTarget { category: string; topic?: string; subtopic?: string; general?: boolean }

export interface IntentRoute {
    facts: FactTarget[];
    faq: string[];
    examples: string[];
    // Rule documents that must win ties for this intent.
    rules: string[];
    // 'always': the question is about the customer's own order, payment or registration.
    crm: 'always' | 'if_asked';
    // 'always': an action, approval or investigation only staff can perform.
    human: 'always' | 'if_asked';
}

const route = (partial: Partial<IntentRoute>): IntentRoute => ({ facts: [], faq: [], examples: [], rules: [], crm: 'if_asked', human: 'if_asked', ...partial });

const TICKET_FACTS: FactTarget[] = [{ category: 'ticket' }, { category: 'pricing', topic: 'ticket' }, { category: 'policy', topic: 'ticket' }];
const EVENT_FACTS: FactTarget[] = [{ category: 'event', general: true }];

export const INTENT_ROUTES: Record<IntentV2, IntentRoute> = {
    ticket: route({ facts: TICKET_FACTS, faq: ['ticket'], examples: ['ticket'] }),
    pricing: route({ facts: [{ category: 'pricing' }, { category: 'ticket' }], faq: ['ticket'], examples: ['ticket'] }),
    registration: route({ facts: [{ category: 'ticket' }, { category: 'policy', topic: 'ticket' }], faq: ['ticket', 'event'] }),
    payment: route({ facts: [{ category: 'policy', topic: 'payment' }], examples: ['payment'], rules: ['escalation_rules', 'status_semantics'], crm: 'always' }),
    refund: route({ facts: [{ category: 'policy', topic: 'refund' }], examples: ['refund'], rules: ['escalation_rules', 'status_semantics'], crm: 'always', human: 'always' }),
    cancellation: route({ facts: [{ category: 'policy', topic: 'refund' }], examples: ['refund'], rules: ['escalation_rules', 'status_semantics'], crm: 'always', human: 'always' }),
    schedule: route({ facts: [{ category: 'policy', topic: 'schedule' }, ...EVENT_FACTS], faq: ['event'] }),
    choreographer: route({ facts: [{ category: 'choreographer' }], faq: ['choreographer'], examples: ['choreographer'] }),
    venue: route({ facts: [{ category: 'event', topic: 'venue' }, ...EVENT_FACTS], faq: ['event'], examples: ['venue'] }),
    check_in: route({ facts: EVENT_FACTS, faq: ['event'] }),
    competition: route({ facts: [{ category: 'competition', topic: 'competition' }], faq: ['competition'], examples: ['competition'], rules: ['year_separation'] }),
    competition_category: route({ facts: [{ category: 'competition', topic: 'competition_category' }], faq: ['competition'], examples: ['competition'], rules: ['year_separation'] }),
    competition_music: route({ facts: [{ category: 'competition', topic: 'competition_music' }], faq: ['competition'], examples: ['competition'], rules: ['year_separation'] }),
    heels_master_stage: route({ facts: [{ category: 'event', topic: 'heels_master_stage' }] }),
    travel: route({ facts: [{ category: 'ticket' }, ...EVENT_FACTS], faq: ['event', 'ticket'] }),
    accommodation: route({ facts: [{ category: 'ticket' }, ...EVENT_FACTS], faq: ['event', 'ticket'] }),
    partnership: route({ facts: [{ category: 'brand' }] }),
    technical_issue: route({ facts: [{ category: 'brand' }], rules: ['escalation_rules'], crm: 'always', human: 'always' }),
    complaint: route({ rules: ['escalation_rules'], crm: 'always', human: 'always' }),
    event: route({ facts: EVENT_FACTS, faq: ['event'] }),
    other: route({}),
};
