export interface SimulationClassification {
    spam: boolean;
    needsReply: boolean;
    replyLanguage: string;
    intent: string;
    secondaryIntents: string[];
    needsCRM: boolean;
    needsHumanAction: boolean;
    urgency: string;
    confidence: number;
}

export interface SimulationKnowledge {
    layer: string;
    chunkId: string;
    documentId: string;
    sourcePath: string;
    score: number;
    content: string;
}

export interface SimulationTrace {
    intent: string;
    secondaryIntents: string[];
    language: string;
    eventYear: number;
    answerability: string;
    needsCRM: boolean;
    crmFound: boolean;
    needsHumanAction: boolean;
    confidence: string;
    needsStaffReview: boolean;
    warnings: string[];
    attempts: number;
    retrievalDurationMs: number;
    generationDurationMs: number;
}

export interface SimulationMetric {
    stage: string;
    provider: string;
    model: string;
    calls: number;
    durationMs: number;
    promptTokens: number;
    completionTokens: number;
}

export interface SimulationView {
    classification: SimulationClassification;
    provider: string;
    model: string;
    promptVersion: string;
    draft: { subject: string; body: string; confidence: number; needsStaffReview: boolean } | null;
    trace: SimulationTrace | null;
    knowledge: SimulationKnowledge[];
    metrics: SimulationMetric[];
}

export interface EmailSimulation extends SimulationView {
    id: string;
    createdAt: string;
    status: string;
    durationMs: number;
    totalTokens: number;
}

export interface EmailSimulationInput {
    fromAddress?: string;
    subject: string;
    body: string;
    classificationPromptId?: string;
    draftPromptId?: string;
    providerConnectionId?: string;
    model?: string;
}

// A past run as listed in the history table, and with everything it produced.
export interface SimulationRunSummary {
    id: string;
    createdAt: string;
    subject: string;
    preview: string;
    status: string;
    provider: string | null;
    model: string | null;
    promptVersion: string | null;
    totalTokens: number;
    durationMs: number;
    error: string | null;
}

export interface SimulationRun extends Omit<SimulationRunSummary, 'preview'> {
    fromAddress: string;
    body: string;
    result: SimulationView | null;
}

export const SIMULATION_PAGE_SIZE = 10;
