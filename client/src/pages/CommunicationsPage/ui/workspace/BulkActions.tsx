import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BulkDispositionResult } from '@/entities/Conversation';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from './BulkActions.module.scss';
import { useBulkDisposition } from '../../model/useBulkDisposition';

export interface BulkActionsProps {
    selectedIds: string[];
    onClear: () => void;
    onDone: (result: BulkDispositionResult) => void;
}

// Shown above the list while at least one conversation is selected.
export const BulkActions = memo((props: BulkActionsProps) => {
    const { t } = useTranslation();
    const { busy, error, apply } = useBulkDisposition(props);
    return (
        <section className={cls.bulkActions} aria-label={t('Actions for selected conversations')}>
            <strong>
                {t('Selected')}: {props.selectedIds.length}
            </strong>
            <div className={cls.bulkButtons}>
                <Button
                    disabled={busy}
                    aria-label={t('Move selected to spam')}
                    onClick={() => void apply('SPAM')}
                >
                    {t('Move to spam')}
                </Button>
                <Button
                    theme={ButtonTheme.OUTLINE_RED}
                    disabled={busy}
                    aria-label={t('Delete selected')}
                    onClick={() => void apply('TRASH')}
                >
                    {t('Delete')}
                </Button>
                <button
                    type="button"
                    className={cls.clearSelection}
                    disabled={busy}
                    onClick={props.onClear}
                >
                    {t('Clear selection')}
                </button>
            </div>
            {error && (
                <p role="alert" className={cls.bulkError}>
                    {error}
                </p>
            )}
        </section>
    );
});
