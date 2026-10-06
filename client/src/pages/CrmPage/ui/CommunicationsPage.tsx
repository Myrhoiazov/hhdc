import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { approveDraft, Conversation, Draft, generateDraft, getConversation, listConversations, listProviders, rejectDraft, replyToConversation } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

const DraftReview = memo(({ draft, refresh }: { draft: Draft; refresh: () => void }) => {
    const { t } = useTranslation();
    const [content, setContent] = useState(draft.content);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const review = async (approve: boolean) => {
        setBusy(true);
        try { await (approve ? approveDraft(draft.id, content) : rejectDraft(draft.id)); refresh(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <section className={cls.panel}><h3>{t('AI draft')} · {t(draft.status)}</h3><Field label="Draft content"><textarea rows={8} value={content} onChange={event => setContent(event.target.value)} /></Field><div className={cls.roles}><Button disabled={busy || !['GENERATED', 'EDITED'].includes(draft.status)} onClick={() => void review(true)}>{t('Approve')}</Button><Button disabled={busy} onClick={() => void review(false)}>{t('Reject')}</Button></div><RequestState error={error} loading={false} /></section>;
});

const ConversationReply = memo(({ conversation, refresh }: { conversation: Conversation; refresh: () => void }) => {
    const { t } = useTranslation();
    const providers = useResource(listProviders);
    const [content, setContent] = useState('');
    const [provider, setProvider] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const perform = async (generate: boolean) => {
        setBusy(true); setError('');
        try { await (generate ? generateDraft(conversation.id) : replyToConversation(conversation.id, content, provider)); setContent(''); refresh(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <section className={cls.panel}><h3>{t('Reply')}</h3><Field label="Email provider"><select value={provider} onChange={event => setProvider(event.target.value)}><option value="">{t('Select provider')}</option>{providers.data?.data.filter(item => item.type === 'EMAIL').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Message"><textarea rows={8} value={content} onChange={event => setContent(event.target.value)} /></Field><div className={cls.roles}><Button disabled={busy || !content.trim() || !provider} onClick={() => void perform(false)}>{t('Send reply')}</Button><Button disabled={busy} onClick={() => void perform(true)}>{t('Generate AI draft')}</Button></div><RequestState error={error} loading={false} />
    </section>;
});

const ConversationThread = memo(({ id }: { id: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => getConversation(id), [id]);
    const thread = useResource(load);
    const refresh = () => void thread.refresh();
    return <><RequestState error={thread.error} loading={thread.loading} />{thread.data && <><section className={cls.panel}><h2>{thread.data.subject}</h2><p>{thread.data.person?.displayName || thread.data.person?.email} · {thread.data.event?.name}</p>{thread.data.messages?.map(message => <article key={message.id} className={cls.panel}><strong>{t(message.direction)}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{message.bodyText}</p><time>{new Date(message.createdAt).toLocaleString()}</time></article>)}</section>{thread.data.drafts?.map(draft => <DraftReview key={draft.id} draft={draft} refresh={refresh} />)}<ConversationReply conversation={thread.data} refresh={refresh} /></>}</>;
});

export const CommunicationsPage = memo(() => {
    const { t } = useTranslation();
    const conversations = useResource(listConversations);
    const [selected, setSelected] = useState('');
    return <CrmLayout title="Communications"><RequestState error={conversations.error} loading={conversations.loading} /><section className={cls.panel}><h2>{t('Inbox')}</h2>{conversations.data?.data.map(item => <div key={item.id} className={cls.row}><Button onClick={() => setSelected(item.id)}>{item.subject}</Button><span>{t(item.status)}</span><span>{item.person?.email}</span></div>)}{conversations.data?.total === 0 && <p>{t('No conversations yet')}</p>}</section>{selected && <ConversationThread key={selected} id={selected} />}</CrmLayout>;
});
