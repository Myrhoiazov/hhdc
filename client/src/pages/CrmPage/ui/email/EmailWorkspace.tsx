import { memo, useCallback, useEffect, useState } from 'react';
import { BulkDispositionResult, Conversation, markConversationRead, PromptVersion, ProviderConnection } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useConversationSelection } from '../../model/useConversationSelection';
import { BulkActions } from './BulkActions';
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
    aiProviders: ProviderConnection[];
    replyPrompts: PromptVersion[];
    providerId: string;
    query: string;
    unread: Record<string, number>;
    onProviderChange: (id: string) => void;
    onQueryChange: (query: string) => void;
    onConversationRemoved: () => void;
    onConversationRead: (id: string) => void;
}

export const EmailWorkspace = memo((props: EmailWorkspaceProps) => {
    const { conversations, total, hasMore, loadingMore, onLoadMore, providers, aiProviders, replyPrompts, providerId, query, unread, onProviderChange, onQueryChange, onConversationRemoved, onConversationRead } = props;
    const [selectedId, setSelectedId] = useState('');
    const hasSelection = Boolean(selectedId);
    // Opening a thread reads it: the CRM list and the mailbox learn about it right away.
    const selectConversation = useCallback((id: string) => {
        setSelectedId(id);
        void markConversationRead(id).then(() => onConversationRead(id)).catch(() => undefined);
    }, [onConversationRead]);
    const selection = useConversationSelection(conversations);
    const { clear, keepOnly } = selection;
    // Another mailbox or search shows other letters: the earlier selection does not carry over.
    useEffect(() => clear(), [providerId, query, clear]);
    // Conversations the mailbox refused stay selected, so the action can be repeated for them.
    const onBulkDone = useCallback((result: BulkDispositionResult) => {
        keepOnly(result.failed.map((failure) => failure.id));
        if (result.applied.includes(selectedId)) setSelectedId('');
        if (result.applied.length) onConversationRemoved();
    }, [keepOnly, selectedId, onConversationRemoved]);
    return <>
        <InboxToolbar providers={providers} providerId={providerId} query={query} unread={unread}
            onProviderChange={onProviderChange} onQueryChange={onQueryChange} />
        <div className={classNames(cls.workspace, { [cls.threadOpen]: hasSelection })}>
            <ConversationList conversations={conversations} total={total} hasMore={hasMore} loadingMore={loadingMore}
                selectedId={selectedId} selection={selection} onSelect={selectConversation} onLoadMore={onLoadMore}>
                {selection.selectedIds.length > 0 && <BulkActions selectedIds={selection.selectedIds} onClear={clear} onDone={onBulkDone} />}
            </ConversationList>
            <ConversationDetail id={selectedId} providers={providers} aiProviders={aiProviders} replyPrompts={replyPrompts} preferredProviderId={providerId}
                onBack={() => setSelectedId('')} onRemoved={() => { setSelectedId(''); onConversationRemoved(); }} />
        </div>
    </>;
});
