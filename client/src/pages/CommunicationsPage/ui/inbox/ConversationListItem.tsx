import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation } from '@/entities/Conversation';
import { isClient } from '@/entities/Person';
import { classNames } from '@/shared/lib/classNames/classNames';
import { mailState, MailState } from '../../model/mailState';
import cls from './Inbox.module.scss';
import { MailBadge, MailBadgeTone } from '@/shared/ui/MailBadge';
import { senderName, previewText, formatListDate } from '../../model/inbox';

const STATE_BADGES: Record<MailState, { label: string; tone: MailBadgeTone }[]> = {
    NEW: [
        { label: 'Incoming', tone: 'incoming' },
        { label: 'New', tone: 'new' },
    ],
    OPENED: [
        { label: 'Incoming', tone: 'incoming' },
        { label: 'Opened', tone: 'opened' },
    ],
    SENT: [{ label: 'Sent', tone: 'sent' }],
};

const ConversationButton = memo(
    ({
        conversation,
        selected,
        onSelect,
    }: {
        conversation: Conversation;
        selected: boolean;
        onSelect: (id: string) => void;
    }) => {
        const { t } = useTranslation();
        const state = mailState(conversation);
        const name = senderName(conversation);
        const labels: Record<MailState, string> = {
            NEW: `${t('Unread')} — ${name} — ${conversation.subject}`,
            OPENED: conversation.subject,
            SENT: `${t('Sent')} — ${conversation.subject}`,
        };
        return (
            <button
                aria-label={labels[state]}
                onClick={() => onSelect(conversation.id)}
                className={classNames(cls.conversationItem, {
                    [cls.selectedConversation]: selected,
                    [cls.openedConversation]: state === 'OPENED',
                })}
            >
                <span className={cls.itemTop}>
                    {state === 'NEW' && <span className={cls.unreadDot} aria-hidden="true" />}
                    <strong className={state === 'NEW' ? cls.unreadText : undefined}>
                        {state === 'SENT' ? `${t('To')}: ${name}` : name}
                    </strong>
                    <time>{formatListDate(conversation.lastMessageAt)}</time>
                </span>
                <span
                    className={classNames(cls.itemSubject, { [cls.unreadText]: state === 'NEW' })}
                >
                    {conversation.subject}
                </span>
                <span className={cls.itemPreview}>{previewText(conversation)}</span>
                <span className={cls.itemBadges}>
                    {STATE_BADGES[state].map((badge) => (
                        <MailBadge key={badge.label} tone={badge.tone}>
                            {t(badge.label)}
                        </MailBadge>
                    ))}
                    {isClient(conversation.person) && (
                        <MailBadge tone="client">{t('Client')}</MailBadge>
                    )}
                </span>
            </button>
        );
    }
);

interface ListItemProps {
    conversation: Conversation;
    selected: boolean;
    checked: boolean;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
}

// The checkbox marks the conversation for a bulk action; the row itself still opens it.
export const ConversationListItem = memo(
    ({ conversation, selected, checked, onSelect, onToggle }: ListItemProps) => {
        const { t } = useTranslation();
        return (
            <div
                className={classNames(cls.conversationRow, { [cls.checkedConversation]: checked })}
            >
                <input
                    type="checkbox"
                    className={cls.rowCheckbox}
                    checked={checked}
                    onChange={() => onToggle(conversation.id)}
                    aria-label={`${t('Select conversation')} — ${conversation.subject}`}
                />
                <ConversationButton
                    conversation={conversation}
                    selected={selected}
                    onSelect={onSelect}
                />
            </div>
        );
    }
);
