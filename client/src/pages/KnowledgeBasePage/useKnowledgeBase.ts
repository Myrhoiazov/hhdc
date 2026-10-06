import { useKnowledgeDocumentActions } from './useKnowledgeDocumentActions';
import { useKnowledgeDocuments } from './useKnowledgeDocuments';
import { useKnowledgeIngestion } from './useKnowledgeIngestion';

export type { KnowledgeDocument, KnowledgeCategory, KnowledgeDocumentStatus } from './knowledgeBaseTypes';

export const useKnowledgeBase = () => {
    const { documents, loading, page, setPage, total, totalPages, pendingTotal, load } = useKnowledgeDocuments();
    const ingestion = useKnowledgeIngestion(load);
    const actions = useKnowledgeDocumentActions(load);

    return { documents, loading, page, setPage, total, totalPages, pendingTotal, ...ingestion, ...actions };
};
