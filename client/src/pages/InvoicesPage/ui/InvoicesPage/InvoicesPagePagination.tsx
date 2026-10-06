import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './InvoicesPage.module.scss';

const PAGE_SIZE = 15;

interface InvoicesPagePaginationProps {
    page: number;
    totalPages: number;
    total: number;
    loading: boolean;
    onPageChange: (page: number) => void;
}

export const InvoicesPagePagination = memo((props: InvoicesPagePaginationProps) => {
    const { page, totalPages, total, loading, onPageChange } = props;
    const { t } = useTranslation();

    if (total <= 0) return null;

    const firstItemNumber = (page - 1) * PAGE_SIZE + 1;
    const lastItemNumber = Math.min(page * PAGE_SIZE, total);

    return (
        <div className={s.pagination}>
            <span>{firstItemNumber}–{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <button
                    className={s.pageButton}
                    disabled={loading || page <= 1}
                    onClick={() => onPageChange(Math.max(page - 1, 1))}
                    aria-label="Предыдущая страница"
                >←</button>
                <span>{page} / {totalPages}</span>
                <button
                    className={s.pageButton}
                    disabled={loading || page >= totalPages}
                    onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                    aria-label="Следующая страница"
                >→</button>
            </div>
        </div>
    );
});
