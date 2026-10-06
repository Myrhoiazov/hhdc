import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { KnowledgeDocument } from './knowledgeBaseTypes';

const PAGE_SIZE = 20;

interface KnowledgeDocumentsResponse {
    items: KnowledgeDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    pendingTotal: number;
}

export const useKnowledgeDocuments = () => {
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pendingTotal, setPendingTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await $apiPrivate.get<KnowledgeDocumentsResponse>('/knowledge/documents', {
                params: { _page: page, _limit: PAGE_SIZE },
            });
            setDocuments(response.data.items);
            setTotal(response.data.total);
            setTotalPages(response.data.totalPages);
            setPendingTotal(response.data.pendingTotal);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    return { documents, loading, page, setPage, total, totalPages, pendingTotal, load };
};
