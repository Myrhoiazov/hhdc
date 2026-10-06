import { useCallback, useState } from 'react';
import { EmailMessage, fetchEmailMessages } from '@/entities/EmailMessage';

export type EmailTab = 'accounts' | 'messages';

const PAGE_SIZE = 25;

// Reload/select-clear on tab change lives in the composing useEmailPage hook —
// both react to the same isAdmin/activeTab condition, so they're one effect there.
export const useEmailMessageList = (selectedMailboxId: number | undefined, search: string) => {
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [totalMessages, setTotalMessages] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // `append: false` replaces the list (new filter/search or a fresh reload after
    // sync/send); `append: true` is "Загрузить ещё" — adds the next page on top of
    // what's already shown instead of resetting scroll position.
    const loadMessages = useCallback(async (targetPage: number, append: boolean) => {
        (append ? setIsLoadingMore : setIsLoadingMessages)(true);
        try {
            const { items, total } = await fetchEmailMessages({
                mailboxId: selectedMailboxId,
                search: search || undefined,
                page: targetPage,
                limit: PAGE_SIZE,
            });
            setMessages((prev) => (append ? [...prev, ...items] : items));
            setTotalMessages(total);
            setPage(targetPage);
        } finally {
            (append ? setIsLoadingMore : setIsLoadingMessages)(false);
        }
    }, [selectedMailboxId, search]);

    const reloadMessages = useCallback(() => loadMessages(1, false), [loadMessages]);
    const onLoadMore = useCallback(() => loadMessages(page + 1, true), [loadMessages, page]);

    return {
        messages,
        setMessages,
        isLoadingMessages,
        isLoadingMore,
        hasMore: messages.length < totalMessages,
        reloadMessages,
        onLoadMore,
    };
};
