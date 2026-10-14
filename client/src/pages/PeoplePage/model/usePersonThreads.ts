import { useCallback, useEffect, useState } from 'react';
import { listConversations, markConversationRead } from '@/entities/Conversation';
import { onEmailSent } from '@/features/composeEmail';
import { useResource } from '@/shared/lib/useResource/useResource';

const THREADS_SHOWN = 50;

// Opening a thread reads it, in the CRM and in the mailbox, and the list shows that right away.
export const usePersonThreads = (personId: string) => {
    const load = useCallback(() => listConversations({ personId }, 1, THREADS_SHOWN), [personId]);
    const threads = useResource(load);
    const [openId, setOpenId] = useState('');
    const { refresh } = threads;
    useEffect(() => onEmailSent(() => void refresh()), [refresh]);
    const open = useCallback(
        (id: string) => {
            setOpenId((current) => (current === id ? '' : id));
            void markConversationRead(id)
                .then(() => refresh())
                .catch(() => undefined);
        },
        [refresh]
    );
    return {
        threads,
        openId,
        open,
        close: () => setOpenId(''),
        removed: () => {
            setOpenId('');
            void refresh();
        },
    };
};
