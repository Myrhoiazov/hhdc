export interface KnowledgeSyncSummary {
    created: number;
    updated: number;
    embedded: number;
    unchanged: number;
    editedInCrm: number;
    failed: string[];
}

export interface KnowledgeDocument {
    id: string;
    title: string;
    scope: string;
    content: string;
    status: string;
    eventId?: string | null;
    sourceType?: string;
    updatedAt?: string;
}

export interface KnowledgeFilters {
    q: string;
    scope: string;
    status: string;
}

export const KNOWLEDGE_PAGE_SIZE = 25;
