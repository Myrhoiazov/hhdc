import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Person } from '@/entities/Person';
import { ComposeEmailModal } from '@/features/composeEmail';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { ThreadRow } from './ThreadRow';
import { OpenThread } from './OpenThread';
import { useMailTools } from '../../../model/useMailTools';
import { usePersonThreads } from '../../../model/usePersonThreads';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './PersonConversations.module.scss';

// The whole correspondence with the person, read and answered without leaving their page.
export const PersonConversations = memo(({ person }: { person: Person }) => {
    const { t } = useTranslation();
    const mail = usePersonThreads(person.id);
    const tools = useMailTools();
    const [composing, setComposing] = useState(false);
    const { data } = mail.threads;
    return (
        <Panel aria-label={t('Correspondence')}>
            <div className={own.header}>
                <h2>{t('Correspondence')}</h2>
                <Button disabled={!person.email} onClick={() => setComposing(true)}>
                    {t('Write an email')}
                </Button>
            </div>
            {!person.email && (
                <p className={cls.muted}>
                    {t('This person has no email address, so there is nobody to write to')}
                </p>
            )}
            <RequestState error={mail.threads.error} loading={mail.threads.loading && !data} />
            {data && data.total > 0 && (
                <p className={cls.muted}>{t('Letters: {{count}}', { count: data.total })}</p>
            )}
            {data?.data.map((thread) => (
                <ThreadRow
                    key={thread.id}
                    thread={thread}
                    selected={mail.openId === thread.id}
                    onOpen={mail.open}
                />
            ))}
            {data?.total === 0 && (
                <p className={cls.muted}>{t('No correspondence with this person yet')}</p>
            )}
            {mail.openId && (
                <OpenThread
                    id={mail.openId}
                    tools={tools}
                    onClose={mail.close}
                    onRemoved={mail.removed}
                />
            )}
            {person.email && (
                <ComposeEmailModal
                    isOpen={composing}
                    onClose={() => setComposing(false)}
                    recipient={person.email}
                />
            )}
        </Panel>
    );
});
