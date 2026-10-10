import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { approveDraft, Conversation, Draft, DraftModelChoice, generateDraft, PromptVersion, ProviderConnection, rejectDraft, replyToConversation } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RequestState } from '../common';
import { AttachmentPicker } from '@/features/composeEmail';
import cls from '../CommunicationsPage.module.scss';

const actionableDraft = (conversation: Conversation) => conversation.drafts?.find(
    (draft) => ['GENERATED', 'EDITED'].includes(draft.status),
);
const conversationProvider = (conversation: Conversation) => [...(conversation.messages ?? [])]
    .reverse().find((message) => message.providerConnectionId)?.providerConnectionId || '';

// What the assistant thinks of its own draft: whether a person must check the facts, and why.
const DraftAssessment = memo(({ draft }: { draft: Draft }) => {
    const { t } = useTranslation();
    const snapshot = draft.contextSnapshot;
    if (!snapshot && draft.confidence == null) return null;
    const review = snapshot?.needsStaffReview ?? false;
    return <div className={cls.draftAssessment}>
        <span className={classNames(cls.mailBadge, {}, [review ? cls.badgeReview : cls.badgeNew])}>{t(review ? 'Needs staff review' : 'Ready for approval')}</span>
        {snapshot?.answerability && <span className={classNames(cls.mailBadge, {}, [cls.badgeOpened])}>{t(snapshot.answerability)}</span>}
        {draft.confidence != null && <span className={classNames(cls.mailBadge, {}, [cls.badgeOpened])}>{t('Confidence')}: {Math.round(draft.confidence * 100)}%</span>}
        {Boolean(snapshot?.warnings?.length) && <small>{snapshot?.warnings?.join(' · ')}</small>}
    </div>;
});

// For testing only: sends this one draft to another connected provider or model, or writes it
// with a saved prompt version that is not active. Real replies use the model saved on the
// provider in Settings and the active prompt.
const AiModelPicker = memo(({ providers, prompts, choice, onChange }: {
    providers: ProviderConnection[]; prompts: PromptVersion[]; choice: DraftModelChoice; onChange: (choice: DraftModelChoice) => void;
}) => {
    const { t } = useTranslation();
    const selected = providers.find((provider) => provider.id === choice.providerConnectionId) ?? providers[0];
    return <div className={cls.modelPicker}>
        <label><span>{t('AI model for this reply (testing)')}</span>
            <select className={cls.modelControl} value={choice.providerConnectionId ?? ''} onChange={(event) => onChange({ ...choice, providerConnectionId: event.target.value || undefined })}>
                <option value="">{t('Default provider')}</option>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{`${provider.name} (${provider.provider})`}</option>)}
            </select>
        </label>
        <label><span className={cls.srOnly}>{t('Model')}</span>
            <input className={cls.modelControl} value={choice.model ?? ''} maxLength={200} placeholder={String(selected?.settings.model ?? '')}
                onChange={(event) => onChange({ ...choice, model: event.target.value.trim() || undefined })} />
        </label>
        {prompts.length > 0 && <label><span>{t('Reply prompt')}</span>
            <select className={cls.modelControl} value={choice.draftPromptId ?? ''} onChange={(event) => onChange({ ...choice, draftPromptId: event.target.value || undefined })}>
                <option value="">{t('Active version')}</option>
                {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{`v${prompt.version} · ${prompt.purpose} (${t(prompt.status)})`}</option>)}
            </select>
        </label>}
    </div>;
});

interface ComposerProps {
    conversation: Conversation;
    providers: ProviderConnection[];
    aiProviders: ProviderConnection[];
    replyPrompts: PromptVersion[];
    preferredProviderId: string;
    refresh: () => void;
}

// A reply leaves from the mailbox the letter came to, so that mailbox is only named; a thread
// that no mailbox owns (none of its letters came through one) still lets the sender be chosen.
const ReplyMailbox = memo(({ providers, threadMailboxId, providerId, onChange }: {
    providers: ProviderConnection[]; threadMailboxId: string; providerId: string; onChange: (id: string) => void;
}) => {
    const { t } = useTranslation();
    const own = providers.find((provider) => provider.id === threadMailboxId);
    if (own) return <p className={cls.providerSelect}><span>{t('From')}</span><strong>{own.name}</strong></p>;
    return <label className={cls.providerSelect}><span>{t('From')}</span><select value={providerId}
        onChange={(event) => onChange(event.target.value)}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>;
});

// One reply field for both ways of answering: an AI draft lands in it as editable text, and
// sending it is the approval — nothing goes out until a person presses "Send reply".
const useReplyComposer = ({ conversation, providers, preferredProviderId, refresh }: ComposerProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Draft | undefined>(actionableDraft(conversation));
    const [content, setContent] = useState(draft?.content ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [choice, setChoice] = useState<DraftModelChoice>({});
    const [providerId, setProviderId] = useState(conversationProvider(conversation) || preferredProviderId || providers[0]?.id || '');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!providerId && providers[0]) setProviderId(providers[0].id); }, [providerId, providers]);
    const run = async (work: () => Promise<void>) => {
        setBusy(true); setError('');
        try { await work(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    const clear = () => { setContent(''); setFiles([]); setDraft(undefined); };
    const send = () => run(async () => {
        await (draft ? approveDraft(draft.id, content, files) : replyToConversation(conversation.id, content, providerId, files));
        clear(); refresh();
    });
    const generate = () => run(async () => {
        const generated = await generateDraft(conversation.id, choice);
        setDraft(generated); setContent(generated.content);
    });
    const discard = () => run(async () => { if (draft) await rejectDraft(draft.id); clear(); refresh(); });
    return { draft, content, setContent, files, setFiles, choice, setChoice, providerId, setProviderId, error, busy, send, generate, discard };
};

export const ConversationComposer = memo((props: ComposerProps) => {
    const { providers, aiProviders, replyPrompts } = props;
    const { t } = useTranslation();
    const composer = useReplyComposer(props);
    const { draft, busy } = composer;
    return <div className={draft ? cls.aiDraft : cls.composer}>
        <div className={cls.composerHeading}><h3>{t('Reply')}</h3><span>{t(draft ? 'AI draft — review before sending' : 'Your reply will be sent as email')}</span></div>
        {draft && <DraftAssessment draft={draft} />}
        {providers.length > 1 && !draft && <ReplyMailbox providers={providers} threadMailboxId={conversationProvider(props.conversation)}
            providerId={composer.providerId} onChange={composer.setProviderId} />}
        <textarea aria-label={t('Reply message')} rows={7} value={composer.content} onChange={(event) => composer.setContent(event.target.value)} placeholder={t('Write a reply…')} />
        <AttachmentPicker files={composer.files} disabled={busy} onChange={composer.setFiles} />
        {aiProviders.length > 0 && <AiModelPicker providers={aiProviders} prompts={replyPrompts} choice={composer.choice} onChange={composer.setChoice} />}
        <div className={cls.composerActions}>
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={busy || !composer.content.trim() || (!draft && !composer.providerId)} onClick={() => void composer.send()}>{t('Send reply')}</Button>
            <Button disabled={busy} onClick={() => void composer.generate()}>{t(busy ? 'Loading…' : 'Generate AI draft')}</Button>
            {draft && <Button disabled={busy} onClick={() => void composer.discard()}>{t('Discard AI draft')}</Button>}
        </div>
        <RequestState error={composer.error} loading={false} />
    </div>;
});
