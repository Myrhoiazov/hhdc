import { useCallback, useEffect, useState } from 'react';
import { EmailMessage, fetchEmailMessages } from '@/entities/EmailMessage';

const PAGE_SIZE = 25;

export const useClientEmailList = (clientId: number, isAdmin: boolean) => {
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMessages = useCallback(async (targetPage: number, append: boolean) => {
        (append ? setIsLoadingMore : setIsLoading)(true);
        try {
            const { items, total: newTotal } = await fetchEmailMessages({
                clientId,
                page: targetPage,
                limit: PAGE_SIZE,
            });
            setMessages((prev) => (append ? [...prev, ...items] : items));
            setTotal(newTotal);
            setPage(targetPage);
        } finally {
            (append ? setIsLoadingMore : setIsLoading)(false);
        }
    }, [clientId]);

    const reloadMessages = useCallback(() => loadMessages(1, false), [loadMessages]);
    const onLoadMore = useCallback(() => loadMessages(page + 1, true), [loadMessages, page]);

    useEffect(() => {
        if (isAdmin && clientId) {
            reloadMessages();
        }
    }, [isAdmin, clientId, reloadMessages]);

    return {
        messages, total, isLoading, isLoadingMore, reloadMessages, onLoadMore,
    };
};
