import type { PromptVersion } from '@/entities/Prompt';
import type { ProviderConnection } from '@/entities/Provider';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    approveDraft,
    Draft,
    DraftModelChoice,
    generateDraft,
    rejectDraft,
    replyToConversation,
    Conversation,
} from '@/entities/Conversation';
import { actionableDraft, conversationProvider } from './replyDraft';

export interface ComposerProps {
    conversation: Conversation;
    providers: ProviderConnection[];
    aiProviders: ProviderConnection[];
    replyPrompts: PromptVersion[];
    preferredProviderId: string;
    refresh: () => void;
}

// One reply field for both ways of answering: an AI draft lands in it as editable text, and
// sending it is the approval — nothing goes out until a person presses "Send reply".
export const useReplyComposer = ({
    conversation,
    providers,
    preferredProviderId,
    refresh,
}: ComposerProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Draft | undefined>(actionableDraft(conversation));
    const [content, setContent] = useState(draft?.content ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [choice, setChoice] = useState<DraftModelChoice>({});
    const [providerId, setProviderId] = useState(
        conversationProvider(conversation) || preferredProviderId || providers[0]?.id || ''
    );
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!providerId && providers[0]) setProviderId(providers[0].id);
    }, [providerId, providers]);
    const run = async (work: () => Promise<void>) => {
        setBusy(true);
        setError('');
        try {
            await work();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        } finally {
            setBusy(false);
        }
    };
    const clear = () => {
        setContent('');
        setFiles([]);
        setDraft(undefined);
    };
    const send = () =>
        run(async () => {
            await (draft
                ? approveDraft(draft.id, content, files)
                : replyToConversation(conversation.id, content, providerId, files));
            clear();
            refresh();
        });
    const generate = () =>
        run(async () => {
            const generated = await generateDraft(conversation.id, choice);
            setDraft(generated);
            setContent(generated.content);
        });
    const discard = () =>
        run(async () => {
            if (draft) await rejectDraft(draft.id);
            clear();
            refresh();
        });
    return {
        draft,
        content,
        setContent,
        files,
        setFiles,
        choice,
        setChoice,
        providerId,
        setProviderId,
        error,
        busy,
        send,
        generate,
        discard,
    };
};
