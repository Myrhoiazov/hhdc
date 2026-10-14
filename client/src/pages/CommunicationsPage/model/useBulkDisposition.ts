import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyBulkConversationDisposition, ConversationDisposition } from '@/entities/Conversation';
import { BulkActionsProps } from '../ui/workspace/BulkActions';

const CONFIRMATIONS: Record<ConversationDisposition, string> = {
    SPAM: 'Move selected conversations to spam ({{count}})?',
    TRASH: 'Move selected conversations to trash ({{count}})?',
};

export const useBulkDisposition = ({ selectedIds, onDone }: BulkActionsProps) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const apply = async (disposition: ConversationDisposition) => {
        if (!window.confirm(t(CONFIRMATIONS[disposition], { count: selectedIds.length }))) return;
        setBusy(true);
        setError('');
        try {
            const result = await applyBulkConversationDisposition(selectedIds, disposition);
            if (result.failed.length)
                setError(
                    t('Could not process {{failed}} of {{total}}', {
                        failed: result.failed.length,
                        total: selectedIds.length,
                    })
                );
            onDone(result);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Mailbox action failed'));
        } finally {
            setBusy(false);
        }
    };
    return { busy, error, apply };
};
