import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LIST_PAGE_SIZE } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from './CrmPage.module.scss';
import own from './ListTable.module.scss';

// Building blocks shared by the list pages of the CRM (people, events): the styles of the filter
// bar and the table, the pager, and the pause before a typed search is sent.
export { own as listStyles };

export const SEARCH_DELAY_MS = 300;

// The list is asked for again only when typing pauses, not on every key.
export const useDelayed = (value: string, delayMs = SEARCH_DELAY_MS) => {
    const [delayed, setDelayed] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDelayed(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return delayed;
};

// The filters of a list page and its page number. `applied` is what the list is asked with: the
// typed search joins it only after a pause. Changing any filter returns to the first page — the
// old page number means nothing in a new list.
export const useListFilters = <Filters extends { q: string }>(none: Filters) => {
    const [filters, setFilters] = useState(none);
    const [page, setPage] = useState(1);
    const q = useDelayed(filters.q).trim();
    const key = JSON.stringify({ ...filters, q });
    const applied = useMemo(() => JSON.parse(key) as Filters, [key]);
    const change = (patch: Partial<Filters>) => { setFilters(current => ({ ...current, ...patch })); setPage(1); };
    return { filters, applied, page, setPage, change, filtered: Object.values(filters).some(Boolean), reset: () => change(none) };
};

export const Pager = memo(({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) => {
    const { t } = useTranslation();
    const pages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
    if (pages === 1) return null;
    return <nav className={own.pager} aria-label={t('Page {{page}} of {{pages}}', { page, pages })}>
        <Button disabled={page <= 1} aria-label={t('Previous page')} onClick={() => onChange(page - 1)}>←</Button>
        <span className={cls.muted}>{t('Page {{page}} of {{pages}}', { page, pages })}</span>
        <Button disabled={page >= pages} aria-label={t('Next page')} onClick={() => onChange(page + 1)}>→</Button>
    </nav>;
});

interface ConfirmDeleteProps { label: string; onDelete: () => Promise<void>; onError?: (message: string) => void }

// Deleting cannot be undone, so the first press only asks and the second one deletes. A refusal
// is handed to `onError`, or shown next to the buttons when nobody takes it.
export const ConfirmDelete = memo(({ label, onDelete, onError }: ConfirmDeleteProps) => {
    const { t } = useTranslation();
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const fail = (message: string) => { if (onError) { onError(message); setAsking(false); } else setError(message); };
    const remove = async () => {
        setBusy(true);
        try { await onDelete(); }
        catch (cause) { fail(cause instanceof Error ? cause.message : t('Unable to delete')); setBusy(false); }
    };
    if (!asking) return <Button theme={ButtonTheme.OUTLINE_RED} aria-label={label} onClick={() => setAsking(true)}>{t('Delete')}</Button>;
    return <span className={cls.actions}>
        <Button theme={ButtonTheme.OUTLINE_RED} disabled={busy} onClick={() => void remove()}>{t('Delete for good')}</Button>
        <Button disabled={busy} onClick={() => { setAsking(false); setError(''); }}>{t('Cancel')}</Button>
        {error && <span role="alert" className={cls.error}>{error}</span>}
    </span>;
});
