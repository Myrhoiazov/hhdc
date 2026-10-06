import { SimulationClassification, SimulationDraft, SimulationKnowledgeChunk, SimulationMetric, SimulationProvider } from './emailSimulationTypes';

export interface SimulationRunSummary {
    id: number;
    fromAddress: string | null;
    subject: string;
    classificationPromptName: string | null;
    draftBodyPromptName: string | null;
    draftProvider: SimulationProvider | null;
    draftModel: string | null;
    classificationSpam: boolean | null;
    classificationConfidence: number | null;
    deterministicSpamReason: string | null;
    draftSkippedReason: string | null;
    createdAt: string;
    metrics: SimulationMetric[];
}

export interface SimulationRunDetail extends SimulationRunSummary {
    body: string;
    classification: SimulationClassification | null;
    knowledge: SimulationKnowledgeChunk[];
    draft: SimulationDraft | null;
}
