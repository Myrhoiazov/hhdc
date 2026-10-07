import type { EmailIntent } from '../email-classification';

// Shared contract between query understanding, the retrieval planner, the layered retriever,
// the context builder, the grounding validator and the draft pipeline.

export type IntentV2 = EmailIntent;
export type RagLanguage = 'ru' | 'uk' | 'nl' | 'en' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// knowledge/hhdc-knowledge-v2/00_runtime/answerability.md
export type Answerability = 'ANSWERABLE' | 'PARTIALLY_ANSWERABLE' | 'CRM_REQUIRED' | 'HUMAN_REQUIRED' | 'NOT_ANSWERABLE';

export interface QueryEntities {
    // A year the customer named explicitly; null means "the current event".
    eventYear: number | null;
    ticketProduct: string | null;
}

export interface QueryUnderstanding {
    language: RagLanguage;
    intent: IntentV2;
    secondaryIntents: IntentV2[];
    needsReply: boolean;
    entities: QueryEntities;
    // The edition the question is about, and whether that is a past edition.
    eventYear: number;
    historical: boolean;
    asksAvailability: boolean;
    needsCRM: boolean;
    needsKnowledge: boolean;
    needsHumanAction: boolean;
    urgency: 'low' | 'normal' | 'high';
}
