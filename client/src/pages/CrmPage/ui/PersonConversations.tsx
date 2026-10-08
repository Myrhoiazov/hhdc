import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation, listConversations, listPrompts, listProviders, markConversationRead, Person, PromptVersion } from '@/entities/crm';
import { ComposeEmailModal, onEmailSent } from '@/features/composeEmail';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { RequestState } from './common';
import { ConversationDetail } from './email/ConversationDetail';
import cls from './CrmPage.module.scss';
import own from './PersonConversations.module.scss';

const REPLY_PROMPT_KEY = 'email_draft_body';
const THREADS_SHOWN = 50;
const NO_PROMPTS: PromptVersion[] = [];

// Prompt versions are a testing aid for people who manage AI; for everyone else the list is empty.
const loadReplyPrompts = async (): Promise<PromptVersion[]> => {
    try { return (await listPrompts()).filter(prompt => prompt.key === REPLY_PROMPT_KEY); }
    catch { return []; }
};

// Mailboxes to answer from and AI providers for drafts, as the mail workspace uses them.
const useMailTools = () => {
    const providers = useResource(listProviders);
    const prompts = useResource(loadReplyPrompts);
    const all = providers.data?.data;
    return useMemo(() => ({
        mailboxes: (all ?? []).filter(provider => provider.type === 'EMAIL' && provider.status !== 'DISABLED'),
        aiProviders: (all ?? []).filter(provider => provider.type === 'AI' && provider.status === 'CONNECTED'),
        replyPrompts: prompts.data ?? NO_PROMPTS,
    }), [all, prompts.data]);
};

const ThreadRow = memo(({ thread, selected, onOpen }: { thread: Conversation; selected: boolean; onOpen: (id: string) => void }) => {
    const { t } = useTranslation();
    const unread = thread.unreadCount ?? 0;
    return <button type="button" aria-expanded={selected} className={classNames(own.thread, { [own.selected]: selected })} onClick={() => onOpen(thread.id)}>
        <span className={classNames(own.subject, { [own.unread]: unread > 0 })}>{thread.subject}</span>
        <span className={own.meta}>{unread > 0 && <>{t('Unread: {{count}}', { count: unread })} · </>}{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString() : ''}</span>
        <span className={own.preview}>{thread.messages?.[0]?.bodyText || ''}</span>
    </button>;
});

interface OpenThreadProps { id: string; tools: ReturnType<typeof useMailTools>; onClose: () => void; onRemoved: () => void }

const OpenThread = memo(({ id, tools, onClose, onRemoved }: OpenThreadProps) => {
    const { t } = useTranslation();
    return <div className={own.detail}>
        <div className={own.detailBar}><Button onClick={onClose}>{t('Close the conversation')}</Button></div>
        <ConversationDetail id={id} providers={tools.mailboxes} aiProviders={tools.aiProviders} replyPrompts={tools.replyPrompts}
            preferredProviderId="" onBack={onClose} onRemoved={onRemoved} />
    </div>;
});

// Opening a thread reads it, in the CRM and in the mailbox, and the list shows that right away.
const usePersonThreads = (personId: string) => {
    const load = useCallback(() => listConversations({ personId }, 1, THREADS_SHOWN), [personId]);
    const threads = useResource(load);
    const [openId, setOpenId] = useState('');
    const { refresh } = threads;
    useEffect(() => onEmailSent(() => void refresh()), [refresh]);
    const open = useCallback((id: string) => {
        setOpenId(current => (current === id ? '' : id));
        void markConversationRead(id).then(() => refresh()).catch(() => undefined);
    }, [refresh]);
    return { threads, openId, open, close: () => setOpenId(''), removed: () => { setOpenId(''); void refresh(); } };
};

// The whole correspondence with the person, read and answered without leaving their page.
export const PersonConversations = memo(({ person }: { person: Person }) => {
    const { t } = useTranslation();
    const mail = usePersonThreads(person.id);
    const tools = useMailTools();
    const [composing, setComposing] = useState(false);
    const { data } = mail.threads;
    return <section className={cls.panel} aria-label={t('Correspondence')}>
        <div className={own.header}>
            <h2>{t('Correspondence')}</h2>
            <Button disabled={!person.email} onClick={() => setComposing(true)}>{t('Write an email')}</Button>
        </div>
        {!person.email && <p className={cls.muted}>{t('This person has no email address, so there is nobody to write to')}</p>}
        <RequestState error={mail.threads.error} loading={mail.threads.loading && !data} />
        {data && data.total > 0 && <p className={cls.muted}>{t('Letters: {{count}}', { count: data.total })}</p>}
        {data?.data.map(thread => <ThreadRow key={thread.id} thread={thread} selected={mail.openId === thread.id} onOpen={mail.open} />)}
        {data?.total === 0 && <p className={cls.muted}>{t('No correspondence with this person yet')}</p>}
        {mail.openId && <OpenThread id={mail.openId} tools={tools} onClose={mail.close} onRemoved={mail.removed} />}
        {person.email && <ComposeEmailModal isOpen={composing} onClose={() => setComposing(false)} recipient={person.email} />}
    </section>;
});
