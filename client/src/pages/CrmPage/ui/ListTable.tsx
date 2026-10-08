import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LIST_PAGE_SIZE } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
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
