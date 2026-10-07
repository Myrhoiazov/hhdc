import { memo, useCallback, useState } from 'react';
import { Conversation, markConversationRead, ProviderConnection } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { ConversationList, InboxToolbar } from './InboxList';
import { ConversationDetail } from './ConversationDetail';
import cls from '../CommunicationsPage.module.scss';

interface EmailWorkspaceProps {
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
    providers: ProviderConnection[];
    providerId: string;
    query: string;
    onProviderChange: (id: string) => void;
    onQueryChange: (query: string) => void;
    onConversationRemoved: () => void;
    onConversationRead: (id: string) => void;
}

export const EmailWorkspace = memo((props: EmailWorkspaceProps) => {
    const { conversations, total, hasMore, loadingMore, onLoadMore, providers, providerId, query, onProviderChange, onQueryChange, onConversationRemoved, onConversationRead } = props;
    const [selectedId, setSelectedId] = useState('');
    const hasSelection = Boolean(selectedId);
    // Opening a thread reads it: the CRM list and the mailbox learn about it right away.
    const selectConversation = useCallback((id: string) => {
        setSelectedId(id);
        void markConversationRead(id).then(() => onConversationRead(id)).catch(() => undefined);
    }, [onConversationRead]);
    return <>
        <InboxToolbar providers={providers} providerId={providerId} query={query}
            onProviderChange={onProviderChange} onQueryChange={onQueryChange} />
        <div className={classNames(cls.workspace, { [cls.threadOpen]: hasSelection })}>
            <ConversationList conversations={conversations} total={total} hasMore={hasMore} loadingMore={loadingMore}
                selectedId={selectedId} onSelect={selectConversation} onLoadMore={onLoadMore} />
            <ConversationDetail id={selectedId} providers={providers} preferredProviderId={providerId}
                onBack={() => setSelectedId('')} onRemoved={() => { setSelectedId(''); onConversationRemoved(); }} />
        </div>
    </>;
});
