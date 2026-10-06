import { z } from 'zod';
import type { EmailClassification, NormalizedEmailInput } from './email-assistant.service';
import type { RagV2Prompt } from './rag-v2/context-builder';
import type { LayeredKnowledge } from './rag-v2/layered-retriever';
import type { QueryUnderstanding } from './rag-v2/rag-v2.types';

export const emailDraftSchema = z.object({
    replyLanguage: z.enum(['nl', 'en', 'ua', 'ru', 'unknown']),
    subject: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(6_000),
    confidence: z.number().min(0).max(1),
    needsManualAnswer: z.boolean(),
    usedKnowledgeIds: z.array(z.string().trim().min(1)).max(20),
}).strict();

export type EmailDraft = z.infer<typeof emailDraftSchema>;

export interface CrmContactProjection {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
}

export interface CrmReader {
    findContactByEmail(email: string): Promise<CrmContactProjection | null>;
}

export interface DraftKnowledgeContext {
    id: string;
    sourceUrl: string;
    content: string;
    score: number;
}

// Present only on the RAG v2 path (RAG_VERSION=v2): the draft prompt is then built from these
// layered sections instead of the flat v1 `knowledge` list (see buildDraftBodyPrompt).
export interface RagV2DraftContext {
    understanding: QueryUnderstanding;
    knowledge: LayeredKnowledge;
    characterBudget: number;
    correction?: string;
    // Reports what survived context-budget trimming, so validation/used-knowledge only ever
    // refer to chunks the model actually saw.
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
    // Prompt window of this client in tokens. RAG v2 sizes its context budget from it, so a
    // hosted model is not trimmed to the local model's num_ctx.
    readonly contextLength?: number;
    generateDraft(context: DraftContext): Promise<EmailDraft>;
}

export const buildDraftContext = async (
    email: NormalizedEmailInput,
    classification: EmailClassification,
    crmReader: CrmReader,
    knowledge: DraftKnowledgeContext[] = [],
): Promise<DraftContext> => ({
    email,
    classification,
    contact: await crmReader.findContactByEmail(email.fromAddress),
    knowledge: knowledge.slice(0, 4).map(({ id, sourceUrl, content, score }) => ({ id, sourceUrl, content, score })),
});

export const generateEmailDraft = async (
    email: NormalizedEmailInput,
    classification: EmailClassification,
    crmReader: CrmReader,
    draftClient: DraftLlmClient,
    knowledge: DraftKnowledgeContext[] = [],
): Promise<EmailDraft | null> => {
    if (classification.spam || !classification.needsReply) return null;
    const context = await buildDraftContext(email, classification, crmReader, knowledge);
    return emailDraftSchema.parse(await draftClient.generateDraft(context));
};
