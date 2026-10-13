import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LIST_PAGE_SIZE } from '@/shared/const/pagination';
import { Button } from '../Button';
import cls from './Pager.module.scss';

interface PagerProps {
    page: number;
    total: number;
    onChange: (page: number) => void;
    // Named by a list whose pages are not of the common size.
    pageSize?: number;
}

// The way through the pages of a list; a list that fits on one page shows nothing.
export const Pager = memo(({ page, total, onChange, pageSize }: PagerProps) => {
    const { t } = useTranslation();
    const pages = Math.max(1, Math.ceil(total / (pageSize ?? LIST_PAGE_SIZE)));
    if (pages === 1) return null;
    const place = t('Page {{page}} of {{pages}}', { page, pages });
    return (
        <nav className={cls.Pager} aria-label={place}>
            <Button disabled={page <= 1} aria-label={t('Previous page')} onClick={() => onChange(page - 1)}>←</Button>
            <span className={cls.place}>{place}</span>
            <Button disabled={page >= pages} aria-label={t('Next page')} onClick={() => onChange(page + 1)}>→</Button>
        </nav>
    );
});
