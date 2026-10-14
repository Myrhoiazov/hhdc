import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { AttachmentPicker } from '@/features/composeEmail';
import cls from './ConversationThread.module.scss';
import { DraftAssessment } from './DraftAssessment';
import { AiModelPicker } from './AiModelPicker';
import { ReplyMailbox } from './ReplyMailbox';
import { conversationProvider } from '../model/replyDraft';
import { ComposerProps, useReplyComposer } from '../model/useReplyComposer';

type Composer = ReturnType<typeof useReplyComposer>;

const ComposerHeading = memo(({ draft }: { draft: boolean }) => {
    const { t } = useTranslation();
    return (
        <div className={cls.composerHeading}>
            <h3>{t('Reply')}</h3>
            <span>
                {t(draft ? 'AI draft — review before sending' : 'Your reply will be sent as email')}
            </span>
        </div>
    );
});

// Sending, asking the assistant for a draft, and dropping a draft that is not wanted.
const ComposerActions = memo(({ composer }: { composer: Composer }) => {
    const { t } = useTranslation();
    const { draft, busy } = composer;
    return (
        <div className={cls.composerActions}>
            <Button
                theme={ButtonTheme.BACKGROUND_INVERTED}
                disabled={busy || !composer.content.trim() || (!draft && !composer.providerId)}
                onClick={() => void composer.send()}
            >
                {t('Send reply')}
            </Button>
            <Button disabled={busy} onClick={() => void composer.generate()}>
                {t(busy ? 'Loading…' : 'Generate AI draft')}
            </Button>
            {draft && (
                <Button disabled={busy} onClick={() => void composer.discard()}>
                    {t('Discard AI draft')}
                </Button>
            )}
        </div>
    );
});

export const ConversationComposer = memo((props: ComposerProps) => {
    const { providers, aiProviders, replyPrompts } = props;
    const { t } = useTranslation();
    const composer = useReplyComposer(props);
    const { draft, busy } = composer;
    return (
        <div className={draft ? cls.aiDraft : cls.composer}>
            <ComposerHeading draft={Boolean(draft)} />
            {draft && <DraftAssessment draft={draft} />}
            {providers.length > 1 && !draft && (
                <ReplyMailbox
                    providers={providers}
                    threadMailboxId={conversationProvider(props.conversation)}
                    providerId={composer.providerId}
                    onChange={composer.setProviderId}
                />
            )}
            <textarea
                aria-label={t('Reply message')}
                rows={7}
                value={composer.content}
                onChange={(event) => composer.setContent(event.target.value)}
                placeholder={t('Write a reply…')}
            />
            <AttachmentPicker files={composer.files} disabled={busy} onChange={composer.setFiles} />
            {aiProviders.length > 0 && (
                <AiModelPicker
                    providers={aiProviders}
                    prompts={replyPrompts}
                    choice={composer.choice}
                    onChange={composer.setChoice}
                />
            )}
            <ComposerActions composer={composer} />
            <RequestState error={composer.error} loading={false} />
        </div>
    );
});
