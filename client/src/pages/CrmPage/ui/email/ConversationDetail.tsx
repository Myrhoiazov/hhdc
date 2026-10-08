import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyConversationDisposition, Conversation, ConversationDisposition, getConversation, Message, PromptVersion, ProviderConnection } from '@/entities/crm';
import { formatFileSize } from '@/features/composeEmail';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RequestState, StatusBadge } from '../common';
import { ConversationComposer } from './ConversationComposer';
import cls from '../CommunicationsPage.module.scss';

const MessageCard = memo(({ message }: { message: Message }) => {
    const { t } = useTranslation();
    const outbound = message.direction === 'OUTBOUND';
    const attachments = message.rawData?.attachments ?? [];
    return <article className={outbound ? cls.outboundMessage : cls.inboundMessage}>
        <div className={cls.messageMeta}>
            <strong>{t(outbound ? 'You' : 'From {{sender}}', { sender: message.sender })}</strong>
            <time>{new Date(message.sentAt || message.receivedAt || message.createdAt).toLocaleString()}</time>
        </div>
        <p>{message.bodyText}</p>
        {attachments.length > 0 && <ul className={cls.attachmentList} aria-label={t('Attachments')}>
            {attachments.map((file) => <li key={file.filename}><span>{file.filename}</span><small>{formatFileSize(file.size)}</small></li>)}
        </ul>}
    </article>;
});

const ConversationActions = memo(({ id, onRemoved }: { id: string; onRemoved: () => void }) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState<ConversationDisposition>();
    const [error, setError] = useState('');
    const apply = async (disposition: ConversationDisposition) => {
        const prompt = disposition === 'SPAM' ? t('Move this conversation to spam?') : t('Move this conversation to trash?');
        if (!window.confirm(prompt)) return;
        setBusy(disposition);
        setError('');
        try { await applyConversationDisposition(id, disposition); onRemoved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Mailbox action failed')); }
        finally { setBusy(undefined); }
    };
    return <div className={cls.conversationActions}>
        <Button disabled={Boolean(busy)} onClick={() => void apply('SPAM')}>{t('Move to spam')}</Button>
        <Button theme={ButtonTheme.OUTLINE_RED} disabled={Boolean(busy)} onClick={() => void apply('TRASH')}>{t('Delete')}</Button>
        {error && <span role="alert">{error}</span>}
    </div>;
});

const ThreadHeader = memo(({ conversation, onBack, onRemoved }: { conversation: Conversation; onBack: () => void; onRemoved: () => void }) => {
    const { t } = useTranslation();
    return <header className={cls.threadHeader}>
        <Button theme={ButtonTheme.CLEAR} className={cls.backButton} onClick={onBack}>{t('Back to inbox')}</Button>
        <div className={cls.threadTitle}><h2>{conversation.subject}</h2>
            <p>{conversation.person?.displayName || conversation.person?.email}</p></div>
        <div className={cls.threadHeaderActions}>
            <StatusBadge status={conversation.status} />
            <ConversationActions id={conversation.id} onRemoved={onRemoved} />
        </div>
    </header>;
});

const EmptyThread = memo(() => {
    const { t } = useTranslation();
    return <section className={cls.threadEmpty}><span aria-hidden="true">✉</span><h2>{t('Select a conversation')}</h2><p>{t('Choose a message from the inbox to read and reply.')}</p></section>;
});

interface DetailProps {
    id: string;
    providers: ProviderConnection[];
    aiProviders: ProviderConnection[];
    replyPrompts: PromptVersion[];
    preferredProviderId: string;
    onBack: () => void;
    onRemoved: () => void;
}

const LoadedConversationDetail = memo(({ id, providers, aiProviders, replyPrompts, preferredProviderId, onBack, onRemoved }: DetailProps) => {
    const load = useCallback(() => getConversation(id), [id]);
    const thread = useResource(load);
    return <section className={cls.threadPanel}>
        <RequestState error={thread.error} loading={thread.loading} />
        {thread.data && <>
            <ThreadHeader conversation={thread.data} onBack={onBack} onRemoved={onRemoved} />
            <div className={cls.messageStream}>{thread.data.messages?.map((message) => <MessageCard key={message.id} message={message} />)}</div>
            <ConversationComposer key={thread.data.id} conversation={thread.data} providers={providers} aiProviders={aiProviders} replyPrompts={replyPrompts}
                preferredProviderId={preferredProviderId} refresh={() => void thread.refresh()} />
        </>}
    </section>;
});

export const ConversationDetail = memo((props: DetailProps) => (props.id ? <LoadedConversationDetail {...props} /> : <EmptyThread />));
