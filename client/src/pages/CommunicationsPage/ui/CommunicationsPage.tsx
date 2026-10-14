import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationFilters } from '@/entities/Conversation';
import { PromptVersion, listReplyPrompts } from '@/entities/Prompt';
import { listProviders } from '@/entities/Provider';
import { onEmailSent } from '@/features/composeEmail';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useConversationPages } from '../model/useConversationPages';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { AccountOverview, MailboxNavigation } from './navigation/MailboxNavigation';
import { EmailWorkspace } from './workspace/EmailWorkspace';
import cls from './CommunicationsPage.module.scss';
import { MailView } from '../model/mailView';
import { loadUnread } from '../model/loadUnread';

const NO_PROMPTS: PromptVersion[] = [];

export const NO_UNREAD: Record<string, number> = {};

export const CommunicationsPage = memo(() => {
    const providers = useResource(listProviders);
    const replyPrompts = useResource(listReplyPrompts);
    const unread = useResource(loadUnread);
    const [view, setView] = useState<MailView>('letters');
    const [providerId, setProviderId] = useState('');
    const [query, setQuery] = useState('');
    const filters = useMemo<ConversationFilters>(
        () => ({
            ...(providerId ? { providerConnectionId: providerId } : {}),
            ...(query.trim() ? { q: query.trim() } : {}),
        }),
        [providerId, query]
    );
    const conversations = useConversationPages(filters);
    const emailProviders = (providers.data?.data ?? []).filter(
        (provider) => provider.type === 'EMAIL' && provider.status !== 'DISABLED'
    );

    const { refresh, markRead } = conversations;
    const refreshUnread = unread.refresh;
    // New letters are written from the header; the list reloads when one has been sent.
    useEffect(() => onEmailSent(refresh), [refresh]);
    const onConversationRead = useCallback(
        (id: string) => {
            markRead(id);
            void refreshUnread();
        },
        [markRead, refreshUnread]
    );
    const onConversationRemoved = useCallback(() => {
        refresh();
        void refreshUnread();
    }, [refresh, refreshUnread]);

    const aiProviders = useMemo(
        () =>
            (providers.data?.data ?? []).filter(
                (provider) => provider.type === 'AI' && provider.status === 'CONNECTED'
            ),
        [providers.data]
    );

    return (
        <CrmLayout title="Email">
            <div className={cls.EmailPage}>
                <MailboxNavigation view={view} providers={emailProviders} onViewChange={setView} />
                <RequestState
                    error={providers.error || conversations.error}
                    loading={providers.loading || conversations.loading}
                />
                {view === 'accounts' ? (
                    <AccountOverview providers={emailProviders} />
                ) : (
                    <EmailWorkspace
                        conversations={conversations.data}
                        total={conversations.total}
                        hasMore={conversations.hasMore}
                        loadingMore={conversations.loading && conversations.data.length > 0}
                        onLoadMore={conversations.loadMore}
                        providers={emailProviders}
                        aiProviders={aiProviders}
                        replyPrompts={replyPrompts.data ?? NO_PROMPTS}
                        providerId={providerId}
                        query={query}
                        unread={unread.data ?? NO_UNREAD}
                        onProviderChange={setProviderId}
                        onQueryChange={setQuery}
                        onConversationRemoved={onConversationRemoved}
                        onConversationRead={onConversationRead}
                    />
                )}
            </div>
        </CrmLayout>
    );
});
