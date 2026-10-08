import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerThread, Conversation, linkChoreographerThread, listChoreographerThreads, listConversations, unlinkChoreographerThread,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

const MIN_REASON = 3;

const ThreadCard = memo(({ thread, canLink, onUnlink }: { thread: ChoreographerThread; canLink: boolean; onUnlink: (thread: ChoreographerThread) => void }) => {
    const { t } = useTranslation();
    const message = thread.latestMessage;
    return <article className={own.assignment} aria-label={thread.subject}>
        <div className={own.headerTop}>
            <div><strong>{thread.subject}</strong>
                <div className={own.secondary}>{[new Date(thread.lastMessageAt).toLocaleDateString(), thread.event?.name, message ? `${message.sender} → ${message.recipient}` : ''].filter(Boolean).join(' · ')}</div></div>
            <span className={own.chips}><span className={own.chip}>{t(`PROVENANCE_${thread.provenance}`)}</span><StatusBadge status={thread.status} /></span>
        </div>
        {message && <p className={own.bio}>{message.preview}</p>}
        {thread.link?.note && <div className={own.secondary}>{`${t('Reason for the link')}: ${thread.link.note}`}</div>}
        {canLink && thread.provenance === 'manual_link'
            && <div className={cls.actions}><Button aria-label={`${t('Unlink')}: ${thread.subject}`} onClick={() => onUnlink(thread)}>{t('Unlink')}</Button></div>}
    </article>;
});

interface PickerProps { personId: string; candidates: ChoreographerThread[]; onLinked: () => void }

const optionLabel = (item: { subject: string; person?: { displayName?: string; email?: string | null } | null }) =>
    [item.subject, item.person?.displayName || item.person?.email].filter(Boolean).join(' — ');

// Linking is always a deliberate act with a written reason. Suggestions come only from the
// choreographer's own extra addresses; mail from a manager has to be found and linked by hand.
const LinkConversation = memo(({ personId, candidates, onLinked }: PickerProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(() => (search.trim().length >= 2 ? listConversations({ q: search.trim() }, 1, 10) : Promise.resolve({ data: [] as Conversation[], total: 0 })), [search]);
    const found = useResource(load);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const conversationId = String(form.get('conversationId') ?? '');
        const note = String(form.get('note') ?? '').trim();
        if (!conversationId || note.length < MIN_REASON) { setError(t('Choose a conversation and say why it belongs here')); return; }
        setBusy(true); setError('');
        try { await linkChoreographerThread(personId, conversationId, note); element.reset(); setSearch(''); onLinked(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <form className={cls.panel} onSubmit={submit} aria-label={t('Link conversation')}><h2>{t('Link conversation')}</h2>
        <p className={cls.muted}>{t('Mail from a manager or an agency is never linked automatically: the same person may represent several choreographers.')}</p>
        <div className={cls.grid}>
            <Field label="Find conversation"><input value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
            <Field label="Conversation"><select name="conversationId" defaultValue="">
                <option value="">{t('Select conversation')}</option>
                {candidates.length > 0 && <optgroup label={t('Suggested: sent from an own address')}>
                    {candidates.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</optgroup>}
                {found.data?.data.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
            </select></Field>
            <div className={cls.wide}><Field label="Reason for the link"><input name="note" maxLength={500} /></Field></div>
        </div>
        {error && <p role="alert" className={cls.error}>{error}</p>}
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Link conversation')}</Button></div>
    </form>;
});

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
        unlinkChoreographerThread(personId, thread.id, note.trim()).then(() => threads.refresh())
            .catch((cause) => setError(cause instanceof Error ? cause.message : t('Request failed')));
    };
    return <>
        <Field label="Search emails"><input value={q} onChange={(event) => setQ(event.target.value)} /></Field>
        <RequestState error={error || threads.error} loading={threads.loading && !threads.data} />
        <section className={cls.panel} aria-label={t('Emails')}><h2>{t('Emails')}</h2>
            {threads.data?.data.map((thread) => <ThreadCard key={thread.id} thread={thread} canLink={canLink} onUnlink={unlink} />)}
            {threads.data?.total === 0 && <p className={cls.muted}>{t('No correspondence is linked to this choreographer yet.')}</p>}
            <Link to="/email">{t('Open the Email workspace to read and reply')}</Link>
        </section>
        {canLink && <LinkConversation personId={personId} candidates={threads.data?.candidates ?? []} onLinked={() => void threads.refresh()} />}
    </>;
});
