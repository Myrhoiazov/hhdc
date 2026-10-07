import { z } from 'zod';
import type { EmailClassification, NormalizedEmailInput } from './email-classification';
import type { RagV2Prompt } from './rag-v2/context-builder';
import type { LayeredKnowledge } from './rag-v2/layered-retriever';
import type { QueryUnderstanding } from './rag-v2/rag-v2.types';

export const emailDraftSchema = z.object({
    replyLanguage: z.enum(['nl', 'en', 'uk', 'ru', 'unknown']),
    subject: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(6_000),
    confidence: z.number().min(0).max(1),
    needsManualAnswer: z.boolean(),
    usedKnowledgeIds: z.array(z.string().trim().min(1)).max(20),
}).strict();

export type EmailDraft = z.infer<typeof emailDraftSchema>;

// The minimum of a Person the drafting model may see (spec §38: minimum-context principle).
export interface CrmContactProjection {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
}

export interface DraftKnowledgeContext {
    id: string;
    sourceUrl: string;
    content: string;
    score: number;
}

export interface RagV2DraftContext {
    understanding: QueryUnderstanding;
    knowledge: LayeredKnowledge;
    characterBudget: number;
    correction?: string;
    // The customer's own records as text, present only when they were needed and found.
    crmData?: string;
    // Reports what survived context-budget trimming, so validation and the used-knowledge list
    // only ever refer to chunks the model actually saw.
    onPromptBuilt?: (prompt: RagV2Prompt) => void;
}

export interface DraftContext {
    email: NormalizedEmailInput;
    classification: EmailClassification;
    contact: CrmContactProjection | null;
    knowledge: DraftKnowledgeContext[];
    ragV2?: RagV2DraftContext;
}

export interface DraftLlmClient {
    // Prompt window of the model in tokens; RAG v2 sizes its context budget from it.
    readonly contextLength?: number;
    generateDraft(context: DraftContext): Promise<EmailDraft>;
}

// What the CRM holds about the customer for this email, already reduced to the fields the
// contract allows (13_crm_contract/crm-fields.md). `found` is false when there is no record.
export interface CrmContext { found: boolean; text: string }

export interface DraftKnowledgeRef { id: string; sourceUrl: string; score: number }
