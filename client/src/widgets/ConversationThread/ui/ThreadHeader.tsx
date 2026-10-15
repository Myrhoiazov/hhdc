import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
    applyConversationDisposition,
    Conversation,
    ConversationDisposition,
} from '@/entities/Conversation';
import { isClient } from '@/entities/Person';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from './ConversationThread.module.scss';
import { MailBadge } from '@/shared/ui/MailBadge';

const ConversationActions = memo(({ id, onRemoved }: { id: string; onRemoved: () => void }) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState<ConversationDisposition>();
    const [error, setError] = useState('');
    const apply = async (disposition: ConversationDisposition) => {
        const prompt =
            disposition === 'SPAM'
                ? t('Move this conversation to spam?')
                : t('Move this conversation to trash?');
        if (!window.confirm(prompt)) return;
        setBusy(disposition);
        setError('');
        try {
            await applyConversationDisposition(id, disposition);
            onRemoved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Mailbox action failed'));
        } finally {
            setBusy(undefined);
        }
    };
    return (
        <div className={cls.conversationActions}>
            <Button disabled={Boolean(busy)} onClick={() => void apply('SPAM')}>
                {t('Move to spam')}
            </Button>
            <Button
                theme={ButtonTheme.OUTLINE_RED}
                disabled={Boolean(busy)}
                onClick={() => void apply('TRASH')}
            >
                {t('Delete')}
            </Button>
            {error && <span role="alert">{error}</span>}
        </div>
    );
});

export const ThreadHeader = memo(
    ({
        conversation,
        onBack,
        onRemoved,
    }: {
        conversation: Conversation;
        onBack: () => void;
        onRemoved: () => void;
    }) => {
        const { t } = useTranslation();
        return (
            <header className={cls.threadHeader}>
                <Button theme={ButtonTheme.CLEAR} className={cls.backButton} onClick={onBack}>
                    {t('Back to inbox')}
                </Button>
                <div className={cls.threadTitle}>
                    <h2>{conversation.subject}</h2>
                    <p>
                        {conversation.person?.displayName || conversation.person?.email}
                        {isClient(conversation.person) && (
                            <>
                                {' '}
                                <MailBadge tone="client">{t('Client')}</MailBadge>
                            </>
                        )}
                        {conversation.person && (
                            <>
                                {' '}
                                ·{' '}
                                <Link to={`/people/${conversation.person.id}`}>
                                    {t('Open contact card')}
                                </Link>
                            </>
                        )}
                    </p>
                </div>
                <div className={cls.threadHeaderActions}>
                    <StatusBadge status={conversation.status} />
                    <ConversationActions id={conversation.id} onRemoved={onRemoved} />
                </div>
            </header>
        );
    }
);
