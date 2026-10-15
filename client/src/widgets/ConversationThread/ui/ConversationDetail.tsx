import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getConversation } from '@/entities/Conversation';
import { PromptVersion } from '@/entities/Prompt';
import { ProviderConnection } from '@/entities/Provider';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { ConversationComposer } from './ConversationComposer';
import { MessageThread } from './MessageThread';
import cls from './ConversationThread.module.scss';
import { ThreadHeader } from './ThreadHeader';

const EmptyThread = memo(({ className }: { className?: string }) => {
    const { t } = useTranslation();
    return (
        <section className={classNames(cls.threadEmpty, {}, [className])}>
            <span aria-hidden="true">✉</span>
            <h2>{t('Select a conversation')}</h2>
            <p>{t('Choose a message from the inbox to read and reply.')}</p>
        </section>
    );
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

const LoadedConversationDetail = memo(
    ({
        id,
        providers,
        aiProviders,
        replyPrompts,
        preferredProviderId,
        onBack,
        onRemoved,
        className,
    }: DetailProps) => {
        const load = useCallback(() => getConversation(id), [id]);
        const thread = useResource(load);
        return (
            <section className={classNames(cls.threadPanel, {}, [className])}>
                <RequestState error={thread.error} loading={thread.loading} />
                {thread.data && (
                    <>
                        <ThreadHeader
                            conversation={thread.data}
                            onBack={onBack}
                            onRemoved={onRemoved}
                        />
                        <MessageThread
                            key={`messages-${thread.data.id}`}
                            messages={thread.data.messages ?? []}
                        />
                        <ConversationComposer
                            key={thread.data.id}
                            conversation={thread.data}
                            providers={providers}
                            aiProviders={aiProviders}
                            replyPrompts={replyPrompts}
                            preferredProviderId={preferredProviderId}
                            refresh={() => void thread.refresh()}
                        />
                    </>
                )}
            </section>
        );
    }
);

export const ConversationDetail = memo((props: DetailProps) =>
    props.id ? <LoadedConversationDetail {...props} /> : <EmptyThread className={props.className} />
);
