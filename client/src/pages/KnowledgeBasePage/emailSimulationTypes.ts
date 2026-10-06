export interface SimulationNormalized {
    fromAddress: string;
    subject: string;
    normalizedBody: string;
}

export interface SimulationClassification {
    spam: boolean;
    needsReply: boolean;
    language: 'nl' | 'en' | 'ua' | 'ru' | 'unknown';
    intent: string;
    confidence: number;
    reason: string;
}

export interface SimulationKnowledgeChunk {
    id: string;
    sourceUrl: string;
    content: string;
    score: number;
}

export interface SimulationCrmContact {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
}

export interface SimulationDraft {
    replyLanguage: string;
    subject: string;
    body: string;
    confidence: number;
    needsManualAnswer: boolean;
    usedKnowledgeIds: string[];
}

export interface SimulationQueryExpansion {
    cleanQuery: string;
    keywords: string[];
}

export type SimulationStage = 'CLASSIFICATION' | 'QUERY_EXPANSION' | 'RETRIEVAL_EMBEDDING' | 'RERANK' | 'DRAFT';
export type SimulationProvider = 'OLLAMA' | 'OPENAI';

export interface SimulationMetric {
    stage: SimulationStage;
    provider: SimulationProvider;
    model: string;
    callCount: number;
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    meta?: Record<string, unknown>;
}

export interface EmailSimulationResult {
    normalized: SimulationNormalized;
    deterministicSpamReason: string | null;
    classification: SimulationClassification | null;
    knowledge: SimulationKnowledgeChunk[];
    queryExpansion: SimulationQueryExpansion | null;
    crmContact: SimulationCrmContact | null;
    draft: SimulationDraft | null;
    draftSkippedReason: string | null;
    runId: number | null;
    metrics: SimulationMetric[];
}

export interface EmailSimulationForm {
    from: string;
    subject: string;
    body: string;
    topK: string;
    noKnowledge: boolean;
    forceDraft: boolean;
    classificationPromptId: string;
    draftBodyPromptId: string;
    noQueryExpansion: boolean;
    noRerank: boolean;
}

export const emptySimulationForm = (): EmailSimulationForm => ({
    from: '', subject: '', body: '', topK: '', noKnowledge: false, forceDraft: false,
    classificationPromptId: '', draftBodyPromptId: '', noQueryExpansion: false, noRerank: false,
});
