import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '../Button';
import cls from './ConfirmDelete.module.scss';

interface ConfirmDeleteProps {
    label: string;
    onDelete: () => Promise<void>;
    onError?: (message: string) => void;
}

// The two steps of a deletion: asking, and deleting once the answer is yes. A refusal is handed
// to `onError`, or kept here to be shown next to the buttons when nobody takes it.
const useConfirmedDelete = ({
    onDelete,
    onError,
}: Pick<ConfirmDeleteProps, 'onDelete' | 'onError'>) => {
    const { t } = useTranslation();
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const fail = (message: string) => {
        if (!onError) {
            setError(message);
            return;
        }
        onError(message);
        setAsking(false);
    };
    const remove = async () => {
        setBusy(true);
        try {
            await onDelete();
        } catch (cause) {
            fail(cause instanceof Error ? cause.message : t('Unable to delete'));
            setBusy(false);
        }
    };
    const cancel = () => {
        setAsking(false);
        setError('');
    };
    return { asking, busy, error, ask: () => setAsking(true), remove, cancel };
};

// Deleting cannot be undone, so the first press only asks and the second one deletes.
export const ConfirmDelete = memo(({ label, onDelete, onError }: ConfirmDeleteProps) => {
    const { t } = useTranslation();
    const state = useConfirmedDelete({ onDelete, onError });
    if (!state.asking) {
        return (
            <Button theme={ButtonTheme.OUTLINE_RED} aria-label={label} onClick={state.ask}>
                {t('Delete')}
            </Button>
        );
    }
    return (
        <span className={cls.ConfirmDelete}>
            <Button
                theme={ButtonTheme.OUTLINE_RED}
                disabled={state.busy}
                onClick={() => void state.remove()}
            >
                {t('Delete for good')}
            </Button>
            <Button disabled={state.busy} onClick={state.cancel}>
                {t('Cancel')}
            </Button>
            {state.error && (
                <span role="alert" className={cls.error}>
                    {state.error}
                </span>
            )}
        </span>
    );
});
