import { useMemo } from 'react';
import { listReplyPrompts, PromptVersion } from '@/entities/Prompt';
import { listProviders } from '@/entities/Provider';
import { useResource } from '@/shared/lib/useResource/useResource';

const NO_PROMPTS: PromptVersion[] = [];

// Mailboxes to answer from and AI providers for drafts, as the mail workspace uses them.
export const useMailTools = () => {
    const providers = useResource(listProviders);
    const prompts = useResource(listReplyPrompts);
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
