import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyBulkConversationDisposition, BulkDispositionResult, ConversationDisposition } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from '../CommunicationsPage.module.scss';

interface BulkActionsProps {
    selectedIds: string[];
    onClear: () => void;
    onDone: (result: BulkDispositionResult) => void;
}

const CONFIRMATIONS: Record<ConversationDisposition, string> = {
    SPAM: 'Move selected conversations to spam ({{count}})?',
    TRASH: 'Move selected conversations to trash ({{count}})?',
};

const useBulkDisposition = ({ selectedIds, onDone }: BulkActionsProps) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const apply = async (disposition: ConversationDisposition) => {
        if (!window.confirm(t(CONFIRMATIONS[disposition], { count: selectedIds.length }))) return;
        setBusy(true);
        setError('');
        try {
            const result = await applyBulkConversationDisposition(selectedIds, disposition);
            if (result.failed.length) setError(t('Could not process {{failed}} of {{total}}', { failed: result.failed.length, total: selectedIds.length }));
            onDone(result);
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Mailbox action failed')); }
        finally { setBusy(false); }
    };
    return { busy, error, apply };
};

// Shown above the list while at least one conversation is selected.
export const BulkActions = memo((props: BulkActionsProps) => {
    const { t } = useTranslation();
    const { busy, error, apply } = useBulkDisposition(props);
    return <section className={cls.bulkActions} aria-label={t('Actions for selected conversations')}>
        <strong>{t('Selected')}: {props.selectedIds.length}</strong>
        <div className={cls.bulkButtons}>
            <Button disabled={busy} aria-label={t('Move selected to spam')} onClick={() => void apply('SPAM')}>{t('Move to spam')}</Button>
            <Button theme={ButtonTheme.OUTLINE_RED} disabled={busy} aria-label={t('Delete selected')} onClick={() => void apply('TRASH')}>{t('Delete')}</Button>
            <button type="button" className={cls.clearSelection} disabled={busy} onClick={props.onClear}>{t('Clear selection')}</button>
        </div>
        {error && <p role="alert" className={cls.bulkError}>{error}</p>}
    </section>;
});
