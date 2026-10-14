import { useMemo } from 'react';
import { listPrompts, PromptVersion } from '@/entities/Prompt';
import { listProviders } from '@/entities/Provider';
import { useResource } from '@/shared/lib/useResource/useResource';

const REPLY_PROMPT_KEY = 'email_draft_body';

const NO_PROMPTS: PromptVersion[] = [];

// Prompt versions are a testing aid for people who manage AI; for everyone else the list is empty.
const loadReplyPrompts = async (): Promise<PromptVersion[]> => {
    try {
        return (await listPrompts()).filter((prompt) => prompt.key === REPLY_PROMPT_KEY);
    } catch {
        return [];
    }
};

// Mailboxes to answer from and AI providers for drafts, as the mail workspace uses them.
export const useMailTools = () => {
    const providers = useResource(listProviders);
    const prompts = useResource(loadReplyPrompts);
    const all = providers.data?.data;
    return useMemo(
        () => ({
            mailboxes: (all ?? []).filter(
                (provider) => provider.type === 'EMAIL' && provider.status !== 'DISABLED'
            ),
            aiProviders: (all ?? []).filter(
                (provider) => provider.type === 'AI' && provider.status === 'CONNECTED'
            ),
            replyPrompts: prompts.data ?? NO_PROMPTS,
        }),
        [all, prompts.data]
    );
};
