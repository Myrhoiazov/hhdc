import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { approveDraft, Conversation, Draft, generateDraft, ProviderConnection, rejectDraft, replyToConversation } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RequestState } from '../common';
import { AttachmentPicker } from './AttachmentPicker';
import cls from '../CommunicationsPage.module.scss';

const actionableDraft = (conversation: Conversation) => conversation.drafts?.find(
    (draft) => ['GENERATED', 'EDITED'].includes(draft.status),
);
const conversationProvider = (conversation: Conversation) => [...(conversation.messages ?? [])]
    .reverse().find((message) => message.providerConnectionId)?.providerConnectionId || '';

const DraftEditor = memo(({ draft, onComplete }: { draft: Draft; onComplete: () => void }) => {
    const { t } = useTranslation();
    const [content, setContent] = useState(draft.content);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const review = async (approve: boolean) => {
        setBusy(true); setError('');
        try { await (approve ? approveDraft(draft.id, content) : rejectDraft(draft.id)); onComplete(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <div className={cls.aiDraft}>
        <div className={cls.aiDraftHeading}><strong>{t('AI draft')}</strong><span>{t('Review before sending')}</span></div>
        <textarea aria-label={t('AI draft')} rows={7} value={content} onChange={(event) => setContent(event.target.value)} />
        <div className={cls.composerActions}>
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={busy || !content.trim()} onClick={() => void review(true)}>{t('Approve and send')}</Button>
            <Button disabled={busy} onClick={() => void review(false)}>{t('Reject draft')}</Button>
        </div>
        <RequestState error={error} loading={false} />
    </div>;
});

export const ConversationComposer = memo(({ conversation, providers, preferredProviderId, refresh }: {
    conversation: Conversation; providers: ProviderConnection[]; preferredProviderId: string; refresh: () => void;
}) => {
    const { t } = useTranslation();
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const initialProvider = conversationProvider(conversation) || preferredProviderId || providers[0]?.id || '';
    const [providerId, setProviderId] = useState(initialProvider);
    const [draft, setDraft] = useState<Draft | undefined>(actionableDraft(conversation));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!providerId && providers[0]) setProviderId(providers[0].id); }, [providerId, providers]);
    const run = async (work: () => Promise<void>) => {
        setBusy(true); setError('');
        try { await work(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    const send = () => run(async () => { await replyToConversation(conversation.id, content, providerId, files); setContent(''); setFiles([]); refresh(); });
    const generate = () => run(async () => { setDraft(await generateDraft(conversation.id)); });
    if (draft) return <DraftEditor draft={draft} onComplete={() => { setDraft(undefined); refresh(); }} />;
    return <div className={cls.composer}>
        <div className={cls.composerHeading}><h3>{t('Reply')}</h3><span>{t('Your reply will be sent as email')}</span></div>
        {providers.length > 1 && <label className={cls.providerSelect}><span>{t('From')}</span><select value={providerId}
            onChange={(event) => setProviderId(event.target.value)}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>}
        <textarea aria-label={t('Reply message')} rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('Write a reply…')} />
        <AttachmentPicker files={files} disabled={busy} onChange={setFiles} />
        <div className={cls.composerActions}>
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={busy || !content.trim() || !providerId} onClick={() => void send()}>{t('Send reply')}</Button>
            <Button disabled={busy} onClick={() => void generate()}>{t('Generate AI draft')}</Button>
        </div>
        <RequestState error={error} loading={false} />
    </div>;
});
