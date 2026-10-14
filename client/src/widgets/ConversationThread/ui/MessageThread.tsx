import { memo, useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Message } from '@/entities/Conversation';
import { formatDateTime } from '@/shared/lib/format/date';
import { classNames } from '@/shared/lib/classNames/classNames';
import { formatFileSize } from '@/features/composeEmail';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from './ConversationThread.module.scss';

const PREVIEW_LENGTH = 160;

// The start of a letter without the quoted history, on one line.
export const messagePreview = (bodyText: string): string => bodyText
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('>'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREVIEW_LENGTH);

type ExpandedOverrides = Record<string, boolean>;

// Letters the user has not touched follow the default: only the latest one is unfolded.
const useExpandedMessages = (messages: Message[]) => {
    const [overrides, setOverrides] = useState<ExpandedOverrides>({});
    const latestId = messages[messages.length - 1]?.id;
    const isExpanded = useCallback((id: string) => overrides[id] ?? id === latestId, [overrides, latestId]);
    const toggle = useCallback((id: string) => setOverrides((current) => ({ ...current, [id]: !(current[id] ?? id === latestId) })), [latestId]);
    const setAll = useCallback((expanded: boolean) => setOverrides(Object.fromEntries(messages.map((message) => [message.id, expanded]))), [messages]);
    return { isExpanded, toggle, setAll, allExpanded: messages.every((message) => isExpanded(message.id)) };
};

const MessageBody = memo(({ id, message }: { id: string; message: Message }) => {
    const { t } = useTranslation();
    const attachments = message.rawData?.attachments ?? [];
    return <div id={id} className={cls.messageBody}>
        <p>{message.bodyText}</p>
        {attachments.length > 0 && <ul className={cls.attachmentList} aria-label={t('Attachments')}>
            {attachments.map((file) => <li key={file.filename}><span>{file.filename}</span><small>{formatFileSize(file.size)}</small></li>)}
        </ul>}
    </div>;
});

interface MessageCardProps {
    message: Message;
    expanded: boolean;
    onToggle: (id: string) => void;
}

const MessageCard = memo(({ message, expanded, onToggle }: MessageCardProps) => {
    const { t } = useTranslation();
    const bodyId = useId();
    const outbound = message.direction === 'OUTBOUND';
    return <article className={outbound ? cls.outboundMessage : cls.inboundMessage}>
        <button type="button" className={cls.messageMeta} aria-expanded={expanded} aria-controls={expanded ? bodyId : undefined}
            onClick={() => onToggle(message.id)}>
            <span className={classNames(cls.messageChevron, { [cls.messageChevronOpen]: expanded })} aria-hidden="true" />
            <strong>{t(outbound ? 'You' : 'From {{sender}}', { sender: message.sender })}</strong>
            {!expanded && <span className={cls.messagePreview}>{messagePreview(message.bodyText)}</span>}
            <time>{formatDateTime(message.sentAt || message.receivedAt || message.createdAt)}</time>
        </button>
        {expanded && <MessageBody id={bodyId} message={message} />}
    </article>;
});

export const MessageThread = memo(({ messages }: { messages: Message[] }) => {
    const { t } = useTranslation();
    const { isExpanded, toggle, setAll, allExpanded } = useExpandedMessages(messages);
    return <div className={cls.messageStream}>
        {messages.length > 1 && <div className={cls.messageStreamTools}>
            <Button theme={ButtonTheme.CLEAR} onClick={() => setAll(!allExpanded)}>{t(allExpanded ? 'Collapse all' : 'Expand all')}</Button>
        </div>}
        {messages.map((message) => <MessageCard key={message.id} message={message} expanded={isExpanded(message.id)} onToggle={toggle} />)}
    </div>;
});
