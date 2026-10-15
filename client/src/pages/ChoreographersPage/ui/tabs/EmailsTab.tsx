import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerThread,
    listChoreographerThreads,
    unlinkChoreographerThread,
} from '@/entities/Choreographer';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import { MIN_REASON, LinkConversation } from './LinkConversation';

const ThreadCard = memo(
    ({
        thread,
        canLink,
        onUnlink,
    }: {
        thread: ChoreographerThread;
        canLink: boolean;
        onUnlink: (thread: ChoreographerThread) => void;
    }) => {
        const { t } = useTranslation();
        const message = thread.latestMessage;
        return (
            <article className={own.assignment} aria-label={thread.subject}>
                <div className={own.headerTop}>
                    <div>
                        <strong>{thread.subject}</strong>
                        <div className={own.secondary}>
                            {[
                                formatDate(thread.lastMessageAt),
                                thread.event?.name,
                                message ? `${message.sender} → ${message.recipient}` : '',
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </div>
                    </div>
                    <span className={own.chips}>
                        <span className={own.chip}>{t(`PROVENANCE_${thread.provenance}`)}</span>
                        <StatusBadge status={thread.status} />
                    </span>
                </div>
                {message && <p className={own.bio}>{message.preview}</p>}
                {thread.link?.note && (
                    <div
                        className={own.secondary}
                    >{`${t('Reason for the link')}: ${thread.link.note}`}</div>
                )}
                {canLink && thread.provenance === 'manual_link' && (
                    <div className={cls.actions}>
                        <Button
                            aria-label={`${t('Unlink')}: ${thread.subject}`}
                            onClick={() => onUnlink(thread)}
                        >
                            {t('Unlink')}
                        </Button>
                    </div>
                )}
            </article>
        );
    }
);

export const EmailsTab = memo(({ personId, canLink }: { personId: string; canLink: boolean }) => {
    const { t } = useTranslation();
    const [q, setQ] = useState('');
    const load = useCallback(() => listChoreographerThreads(personId, q), [personId, q]);
    const threads = useResource(load);
    const [error, setError] = useState('');
    const unlink = (thread: ChoreographerThread) => {
        const note = window.prompt(t('Why is this conversation removed from the profile?')) ?? '';
        if (note.trim().length < MIN_REASON) return;
        setError('');
        unlinkChoreographerThread(personId, thread.id, note.trim())
            .then(() => threads.refresh())
            .catch((cause) =>
                setError(cause instanceof Error ? cause.message : t('Request failed'))
            );
    };
    return (
        <>
            <Field label="Search emails">
                <input value={q} onChange={(event) => setQ(event.target.value)} />
            </Field>
            <RequestState
                error={error || threads.error}
                loading={threads.loading && !threads.data}
            />
            <Panel aria-label={t('Emails')}>
                <h2>{t('Emails')}</h2>
                {threads.data?.data.map((thread) => (
                    <ThreadCard
                        key={thread.id}
                        thread={thread}
                        canLink={canLink}
                        onUnlink={unlink}
                    />
                ))}
                {threads.data?.total === 0 && (
                    <p className={cls.muted}>
                        {t('No correspondence is linked to this choreographer yet.')}
                    </p>
                )}
                <Link to="/email">{t('Open the Email workspace to read and reply')}</Link>
            </Panel>
            {canLink && (
                <LinkConversation
                    personId={personId}
                    candidates={threads.data?.candidates ?? []}
                    onLinked={() => void threads.refresh()}
                />
            )}
        </>
    );
});
