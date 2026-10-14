import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation } from '@/entities/Conversation';
import { formatDate } from '@/shared/lib/format/date';
import { classNames } from '@/shared/lib/classNames/classNames';
import own from './PersonConversations.module.scss';

export const ThreadRow = memo(
    ({
        thread,
        selected,
        onOpen,
    }: {
        thread: Conversation;
        selected: boolean;
        onOpen: (id: string) => void;
    }) => {
        const { t } = useTranslation();
        const unread = thread.unreadCount ?? 0;
        return (
            <button
                type="button"
                aria-expanded={selected}
                className={classNames(own.thread, { [own.selected]: selected })}
                onClick={() => onOpen(thread.id)}
            >
                <span className={classNames(own.subject, { [own.unread]: unread > 0 })}>
                    {thread.subject}
                </span>
                <span className={own.meta}>
                    {unread > 0 && <>{t('Unread: {{count}}', { count: unread })} · </>}
                    {thread.lastMessageAt ? formatDate(thread.lastMessageAt) : ''}
                </span>
                <span className={own.preview}>{thread.messages?.[0]?.bodyText || ''}</span>
            </button>
        );
    }
);
