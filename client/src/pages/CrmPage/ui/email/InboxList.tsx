import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@/shared/assets/icons/search.svg';
import { Conversation, isClient, ProviderConnection } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { mailState, MailState } from '../../model/mailState';
import cls from '../CommunicationsPage.module.scss';

interface ToolbarProps {
    providers: ProviderConnection[];
    providerId: string;
    query: string;
    onProviderChange: (id: string) => void;
    onQueryChange: (query: string) => void;
}

export const InboxToolbar = memo((props: ToolbarProps) => {
    const { t } = useTranslation();
    const { providers, providerId, query, onProviderChange, onQueryChange } = props;
    return <div className={cls.inboxToolbar}>
        {providers.length > 1 && <div className={cls.mailboxPills} aria-label={t('Email accounts')}>
            <button className={!providerId ? cls.activeMailbox : ''} onClick={() => onProviderChange('')}>{t('All inboxes')}</button>
            {providers.map((provider) => <button key={provider.id} className={providerId === provider.id ? cls.activeMailbox : ''}
                onClick={() => onProviderChange(provider.id)}>{provider.name}</button>)}
        </div>}
        <label className={cls.searchBox}>
            <SearchIcon aria-hidden="true" />
            <span className={cls.srOnly}>{t('Search email')}</span>
            <input value={query} onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t('Search by subject, sender, or text…')} />
        </label>
    </div>;
});

const senderName = (conversation: Conversation) => conversation.person?.displayName
    || conversation.person?.email || conversation.messages?.[0]?.sender || '—';
const previewText = (conversation: Conversation) => conversation.messages?.[0]?.bodyText || '';
const formatListDate = (value?: string) => value
    ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '';

const STATE_BADGES: Record<MailState, { label: string; className: string }[]> = {
    NEW: [{ label: 'Incoming', className: cls.badgeIncoming }, { label: 'New', className: cls.badgeNew }],
    OPENED: [{ label: 'Incoming', className: cls.badgeIncoming }, { label: 'Opened', className: cls.badgeOpened }],
    SENT: [{ label: 'Sent', className: cls.badgeSent }],
};

const ConversationListItem = memo(({ conversation, selected, onSelect }: {
    conversation: Conversation; selected: boolean; onSelect: (id: string) => void;
}) => {
    const { t } = useTranslation();
    const state = mailState(conversation);
    const name = senderName(conversation);
    const labels: Record<MailState, string> = {
        NEW: `${t('Unread')} — ${name} — ${conversation.subject}`,
        OPENED: conversation.subject,
        SENT: `${t('Sent')} — ${conversation.subject}`,
    };
    return <button aria-label={labels[state]} onClick={() => onSelect(conversation.id)}
        className={classNames(cls.conversationItem, { [cls.selectedConversation]: selected, [cls.openedConversation]: state === 'OPENED' })}>
        <span className={cls.itemTop}>{state === 'NEW' && <span className={cls.unreadDot} aria-hidden="true" />}
            <strong className={state === 'NEW' ? cls.unreadText : undefined}>{state === 'SENT' ? `${t('To')}: ${name}` : name}</strong>
            <time>{formatListDate(conversation.lastMessageAt)}</time></span>
        <span className={classNames(cls.itemSubject, { [cls.unreadText]: state === 'NEW' })}>{conversation.subject}</span>
        <span className={cls.itemPreview}>{previewText(conversation)}</span>
        <span className={cls.itemBadges}>{STATE_BADGES[state].map((badge) => <span key={badge.label}
            className={classNames(cls.mailBadge, {}, [badge.className])}>{t(badge.label)}</span>)}
            {isClient(conversation.person) && <span className={classNames(cls.mailBadge, {}, [cls.badgeClient])}>{t('Client')}</span>}</span>
    </button>;
});

export const ConversationList = memo(({ conversations, total, hasMore, loadingMore, selectedId, onSelect, onLoadMore }: {
    conversations: Conversation[]; total: number; hasMore: boolean; loadingMore: boolean;
    selectedId: string; onSelect: (id: string) => void; onLoadMore: () => void;
}) => {
    const { t } = useTranslation();
    return <aside className={cls.conversationList} aria-label={t('Letters')}>
        <div className={cls.listHeading}><strong>{t('Letters')}</strong><span>{conversations.length} / {total}</span></div>
        <div className={cls.listScroll}>{conversations.map((conversation) => <ConversationListItem key={conversation.id}
            conversation={conversation} selected={selectedId === conversation.id} onSelect={onSelect} />)}
            {hasMore && <button className={cls.loadMore} disabled={loadingMore} onClick={onLoadMore}>
                {t(loadingMore ? 'Loading…' : 'Load more')}
            </button>}</div>
        {!conversations.length && <p className={cls.emptyList}>{t('No conversations found')}</p>}
    </aside>;
});
