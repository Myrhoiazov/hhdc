import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConversationFilters, listProviders } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useConversationPages } from '../model/useConversationPages';
import { CrmLayout, RequestState } from './common';
import { AccountOverview, MailboxNavigation } from './email/MailboxNavigation';
import { EmailWorkspace } from './email/EmailWorkspace';
import { ComposeEmailModal } from './email/ComposeEmailModal';
import cls from './CommunicationsPage.module.scss';

type MailView = 'letters' | 'accounts';

export const CommunicationsPage = memo(() => {
    const { t } = useTranslation();
    const [composeOpen, setComposeOpen] = useState(false);
    const providers = useResource(listProviders);
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

    const { refresh } = conversations;
    const onEmailSent = useCallback(() => { setComposeOpen(false); refresh(); }, [refresh]);

    return <CrmLayout title="Email">
        <div className={cls.EmailPage}>
            <div className={cls.pageActions}>
                <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={!emailProviders.length}
                    onClick={() => setComposeOpen(true)}>{t('New email')}</Button>
            </div>
            <MailboxNavigation view={view} providers={emailProviders} onViewChange={setView} />
            <RequestState error={providers.error || conversations.error} loading={providers.loading || conversations.loading} />
            {view === 'accounts'
                ? <AccountOverview providers={emailProviders} />
                : <EmailWorkspace conversations={conversations.data} total={conversations.total} hasMore={conversations.hasMore}
                        loadingMore={conversations.loading && conversations.data.length > 0} onLoadMore={conversations.loadMore} providers={emailProviders}
                        providerId={providerId} query={query} onProviderChange={setProviderId} onQueryChange={setQuery}
                        onConversationRemoved={conversations.refresh}
                        onConversationRead={conversations.markRead} />}
            <ComposeEmailModal isOpen={composeOpen} providers={emailProviders} preferredProviderId={providerId}
                onClose={() => setComposeOpen(false)} onSent={onEmailSent} />
        </div>
    </CrmLayout>;
});
