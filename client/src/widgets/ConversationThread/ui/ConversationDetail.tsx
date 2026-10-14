import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { applyConversationDisposition, Conversation, ConversationDisposition, getConversation } from '@/entities/Conversation';
import { isClient } from '@/entities/Person';
import { PromptVersion } from '@/entities/Prompt';
import { ProviderConnection } from '@/entities/Provider';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ConversationComposer } from './ConversationComposer';
import { MessageThread } from './MessageThread';
import cls from './ConversationThread.module.scss';
import { MailBadge } from '@/shared/ui/MailBadge';

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
            <p>{conversation.person?.displayName || conversation.person?.email}
                {isClient(conversation.person) && <> <MailBadge tone="client">{t('Client')}</MailBadge></>}
                {conversation.person && <> · <Link to={`/people/${conversation.person.id}`}>{t('Open contact card')}</Link></>}</p></div>
        <div className={cls.threadHeaderActions}>
            <StatusBadge status={conversation.status} />
            <ConversationActions id={conversation.id} onRemoved={onRemoved} />
        </div>
    </header>;
});

const EmptyThread = memo(({ className }: { className?: string }) => {
    const { t } = useTranslation();
    return <section className={classNames(cls.threadEmpty, {}, [className])}><span aria-hidden="true">✉</span><h2>{t('Select a conversation')}</h2><p>{t('Choose a message from the inbox to read and reply.')}</p></section>;
});

interface DetailProps {
    id: string;
    providers: ProviderConnection[];
    aiProviders: ProviderConnection[];
    replyPrompts: PromptVersion[];
    preferredProviderId: string;
    onBack: () => void;
    onRemoved: () => void;
    // Laid on the root by the page that places the thread, e.g. to hide it on a phone until a letter is open.
    className?: string;
}

const LoadedConversationDetail = memo(({ id, providers, aiProviders, replyPrompts, preferredProviderId, onBack, onRemoved, className }: DetailProps) => {
    const load = useCallback(() => getConversation(id), [id]);
    const thread = useResource(load);
    return <section className={classNames(cls.threadPanel, {}, [className])}>
        <RequestState error={thread.error} loading={thread.loading} />
        {thread.data && <>
            <ThreadHeader conversation={thread.data} onBack={onBack} onRemoved={onRemoved} />
            <MessageThread key={`messages-${thread.data.id}`} messages={thread.data.messages ?? []} />
            <ConversationComposer key={thread.data.id} conversation={thread.data} providers={providers} aiProviders={aiProviders} replyPrompts={replyPrompts}
                preferredProviderId={preferredProviderId} refresh={() => void thread.refresh()} />
        </>}
    </section>;
});

export const ConversationDetail = memo((props: DetailProps) => (props.id ? <LoadedConversationDetail {...props} /> : <EmptyThread className={props.className} />));
