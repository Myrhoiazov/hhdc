import { useCallback, useEffect, useState } from 'react';
import { Conversation, ConversationFilters, listConversations } from '@/entities/crm';

export const CONVERSATION_PAGE_SIZE = 25;

interface ConversationPageState {
    data: Conversation[];
    total: number;
    error: string;
    loading: boolean;
}

const initialState: ConversationPageState = { data: [], total: 0, error: '', loading: true };

export const useConversationPages = (filters: ConversationFilters) => {
    // The page belongs to the filters it was requested for, so new filters start from page one.
    const [cursor, setCursor] = useState({ filters, page: 1 });
    const [refreshKey, setRefreshKey] = useState(0);
    const [state, setState] = useState(initialState);
    const page = cursor.filters === filters ? cursor.page : 1;

    useEffect(() => {
        let current = true;
        setState((previous) => ({ ...previous, loading: true, error: '' }));
        void listConversations(filters, page, CONVERSATION_PAGE_SIZE).then((result) => {
            if (!current) return;
            setState((previous) => ({
                data: page === 1 ? result.data : [...previous.data, ...result.data.filter(
                    (item) => !previous.data.some((stored) => stored.id === item.id),
                )],
                total: result.total,
                error: '',
                loading: false,
            }));
        }).catch((cause) => {
            if (current) setState((previous) => ({ ...previous, error: cause instanceof Error ? cause.message : 'Request failed', loading: false }));
        });
        return () => { current = false; };
    }, [filters, page, refreshKey]);

    const refresh = useCallback(() => {
        setCursor({ filters, page: 1 });
        setRefreshKey((value) => value + 1);
    }, [filters]);
    const loadMore = useCallback(() => setCursor({ filters, page: page + 1 }), [filters, page]);
    // Updates the loaded rows in place: a refetch would collapse the list back to the first page.
    const markRead = useCallback((id: string) => setState((previous) => ({
        ...previous,
        data: previous.data.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)),
    })), []);
    return { ...state, refresh, loadMore, markRead, hasMore: state.data.length < state.total };
};
