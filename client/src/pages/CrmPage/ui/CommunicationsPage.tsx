import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationFilters, getUnreadByMailbox, listPrompts, listProviders, PromptVersion } from '@/entities/crm';
import { onEmailSent } from '@/features/composeEmail';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useConversationPages } from '../model/useConversationPages';
import { CrmLayout, RequestState } from './common';
import { AccountOverview, MailboxNavigation } from './email/MailboxNavigation';
import { EmailWorkspace } from './email/EmailWorkspace';
import cls from './CommunicationsPage.module.scss';

type MailView = 'letters' | 'accounts';

const REPLY_PROMPT_KEY = 'email_draft_body';
// Prompt versions are a testing aid for people who manage AI; for everyone else the list is
// simply empty and the picker is not shown.
const loadReplyPrompts = async (): Promise<PromptVersion[]> => {
    try { return (await listPrompts()).filter((prompt) => prompt.key === REPLY_PROMPT_KEY); }
    catch { return []; }
};
const NO_PROMPTS: PromptVersion[] = [];
const NO_UNREAD: Record<string, number> = {};
// The counters are a hint on the tabs: when they cannot be loaded the inbox still works without them.
const loadUnread = async (): Promise<Record<string, number>> => {
    try { return await getUnreadByMailbox(); }
    catch { return NO_UNREAD; }
};

export const CommunicationsPage = memo(() => {
    const providers = useResource(listProviders);
    const replyPrompts = useResource(loadReplyPrompts);
    const unread = useResource(loadUnread);
    const [view, setView] = useState<MailView>('letters');
    const [providerId, setProviderId] = useState('');
    const [query, setQuery] = useState('');
    const filters = useMemo<ConversationFilters>(() => ({
        ...(providerId ? { providerConnectionId: providerId } : {}),
        ...(query.trim() ? { q: query.trim() } : {}),
    }), [providerId, query]);
    const conversations = useConversationPages(filters);
    const emailProviders = (providers.data?.data ?? []).filter(
        (provider) => provider.type === 'EMAIL' && provider.status !== 'DISABLED',
    );

    const { refresh, markRead } = conversations;
    const refreshUnread = unread.refresh;
    // New letters are written from the header; the list reloads when one has been sent.
    useEffect(() => onEmailSent(refresh), [refresh]);
    const onConversationRead = useCallback((id: string) => { markRead(id); void refreshUnread(); }, [markRead, refreshUnread]);
    const onConversationRemoved = useCallback(() => { refresh(); void refreshUnread(); }, [refresh, refreshUnread]);

    const aiProviders = useMemo(() => (providers.data?.data ?? []).filter(
        (provider) => provider.type === 'AI' && provider.status === 'CONNECTED',
    ), [providers.data]);

    return <CrmLayout title="Email">
        <div className={cls.EmailPage}>
            <MailboxNavigation view={view} providers={emailProviders} onViewChange={setView} />
            <RequestState error={providers.error || conversations.error} loading={providers.loading || conversations.loading} />
            {view === 'accounts'
                ? <AccountOverview providers={emailProviders} />
                : <EmailWorkspace conversations={conversations.data} total={conversations.total} hasMore={conversations.hasMore}
                        loadingMore={conversations.loading && conversations.data.length > 0} onLoadMore={conversations.loadMore} providers={emailProviders} aiProviders={aiProviders} replyPrompts={replyPrompts.data ?? NO_PROMPTS}
                        providerId={providerId} query={query} unread={unread.data ?? NO_UNREAD} onProviderChange={setProviderId} onQueryChange={setQuery}
                        onConversationRemoved={onConversationRemoved}
                        onConversationRead={onConversationRead} />}
        </div>
    </CrmLayout>;
});
