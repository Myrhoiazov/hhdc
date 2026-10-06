// Shared RAG v2 contract between query understanding, the retrieval planner, the layered
// retriever, the context builder, the grounding validator and the draft pipeline.

export const INTENTS_V2 = [
    'registration', 'schedule', 'location', 'pricing', 'payment', 'subscription', 'trial',
    'dance_style', 'age_group', 'beginner', 'clothing', 'parent_question', 'complaint',
    'cancellation', 'camp', 'other',
] as const;
export type IntentV2 = typeof INTENTS_V2[number];

export type RagLanguage = 'ru' | 'uk' | 'nl' | 'en' | 'unknown';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface QueryEntities {
    city: string | null;
    age: number | null;
    style: string | null;
    weekday: string | null;
    time: string | null;
    paymentTopic: string | null;
    subscriptionTopic: string | null;
    campTopic: string | null;
}

export interface QueryUnderstanding {
    language: RagLanguage;
    intent: IntentV2;
    subintent: string | null;
    // Other topics the same message asks about ("I want to register — where are you in
    // Rotterdam?" = registration + location); the planner retrieves for these too.
    secondaryIntents: IntentV2[];
    needsReply: boolean;
    entities: QueryEntities;
    asksAvailability: boolean;
    needsCurrentFacts: boolean;
    needsBusinessRules: boolean;
    needsExamples: boolean;
}
