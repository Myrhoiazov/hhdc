import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@/shared/assets/icons/search.svg';
import { Conversation, isClient, ProviderConnection } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { mailState, MailState } from '../../model/mailState';
import { ConversationSelection } from '../../model/useConversationSelection';
import cls from '../CommunicationsPage.module.scss';

const SEARCH_GLASS = '8 8 16 16';

interface ToolbarProps {
    providers: ProviderConnection[];
    providerId: string;
    query: string;
    // Conversations with unread mail per mailbox id.
    unread: Record<string, number>;
    onProviderChange: (id: string) => void;
    onQueryChange: (query: string) => void;
}

const MailboxPill = memo(({ label, count, active, onSelect }: { label: string; count: number; active: boolean; onSelect: () => void }) => {
    const { t } = useTranslation();
    return <button className={active ? cls.activeMailbox : ''} aria-pressed={active}
        aria-label={count ? `${label} — ${t('Unread')}: ${count}` : label} onClick={onSelect}>
        {label}{count > 0 && <span className={cls.mailboxCount} aria-hidden="true">{count}</span>}
    </button>;
});

const totalUnread = (unread: Record<string, number>, providers: ProviderConnection[]) =>
    providers.reduce((sum, provider) => sum + (unread[provider.id] ?? 0), 0);

export const InboxToolbar = memo((props: ToolbarProps) => {
    const { t } = useTranslation();
    const { providers, providerId, query, unread, onProviderChange, onQueryChange } = props;
    return <div className={cls.inboxToolbar}>
        {providers.length > 1 && <div className={cls.mailboxPills} aria-label={t('Email accounts')}>
            <MailboxPill label={t('All inboxes')} count={totalUnread(unread, providers)} active={!providerId} onSelect={() => onProviderChange('')} />
            {providers.map((provider) => <MailboxPill key={provider.id} label={provider.name} count={unread[provider.id] ?? 0}
                active={providerId === provider.id} onSelect={() => onProviderChange(provider.id)} />)}
        </div>}
        <label className={cls.searchBox}>
            {/* The glass is drawn in the middle of a larger canvas; the view is cut to the glass itself. */}
            <SearchIcon aria-hidden="true" viewBox={SEARCH_GLASS} />
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

const ConversationButton = memo(({ conversation, selected, onSelect }: {
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

interface ListItemProps {
    conversation: Conversation;
    selected: boolean;
    checked: boolean;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
}

// The checkbox marks the conversation for a bulk action; the row itself still opens it.
const ConversationListItem = memo(({ conversation, selected, checked, onSelect, onToggle }: ListItemProps) => {
    const { t } = useTranslation();
    return <div className={classNames(cls.conversationRow, { [cls.checkedConversation]: checked })}>
        <input type="checkbox" className={cls.rowCheckbox} checked={checked} onChange={() => onToggle(conversation.id)}
            aria-label={`${t('Select conversation')} — ${conversation.subject}`} />
        <ConversationButton conversation={conversation} selected={selected} onSelect={onSelect} />
    </div>;
});

const ListHeading = memo(({ loaded, total, selection }: { loaded: number; total: number; selection: ConversationSelection }) => {
    const { t } = useTranslation();
    return <div className={cls.listHeading}>
        <label className={cls.selectAll}>
            <input type="checkbox" className={cls.rowCheckbox} checked={selection.allSelected} disabled={!loaded}
                onChange={selection.toggleAll} aria-label={t('Select all loaded conversations')} />
            <strong>{t('Letters')}</strong>
        </label>
        <span>{loaded} / {total}</span>
    </div>;
});

interface ConversationListProps {
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
    loadingMore: boolean;
    selectedId: string;
    selection: ConversationSelection;
    onSelect: (id: string) => void;
    onLoadMore: () => void;
    // The bulk actions bar, shown between the heading and the letters.
    children?: ReactNode;
}

export const ConversationList = memo((props: ConversationListProps) => {
    const { conversations, total, hasMore, loadingMore, selectedId, selection, onSelect, onLoadMore, children } = props;
    const { t } = useTranslation();
    return <aside className={cls.conversationList} aria-label={t('Letters')}>
        <ListHeading loaded={conversations.length} total={total} selection={selection} />
        {children}
        <div className={cls.listScroll}>{conversations.map((conversation) => <ConversationListItem key={conversation.id}
            conversation={conversation} selected={selectedId === conversation.id} checked={selection.selectedIds.includes(conversation.id)}
            onSelect={onSelect} onToggle={selection.toggle} />)}
            {hasMore && <button className={cls.loadMore} disabled={loadingMore} onClick={onLoadMore}>
                {t(loadingMore ? 'Loading…' : 'Load more')}
            </button>}</div>
        {!conversations.length && <p className={cls.emptyList}>{t('No conversations found')}</p>}
    </aside>;
});
