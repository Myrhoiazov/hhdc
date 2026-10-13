export interface AiProposal {
    id: string;
    type: string;
    status: string;
    payload: { title?: string; description?: string; dueDate?: string };
}

export interface AssistantAnswer {
    answer: string;
    references: { tool: string; ok: boolean }[];
    proposal: AiProposal | null;
}

export interface ReviewQueue {
    drafts: { id: string; conversationId: string; intent: string; confidence?: number | null }[];
    lowConfidenceDrafts: number;
    proposals: AiProposal[];
    duplicates: { id: string; score: number }[];
}
