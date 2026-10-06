import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import s from './MollieIncidents.module.scss';

const PAGE_SIZE = 25;

interface MollieIncidentsPaginationProps {
    page: number;
    totalPages: number;
    total: number;
    isLoading: boolean;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

export const MollieIncidentsPagination = memo((props: MollieIncidentsPaginationProps) => {
    const { page, totalPages, total, isLoading, onPreviousPage, onNextPage } = props;
    const { t } = useTranslation();

    if (total <= 0) return null;

    const firstItemNumber = (page - 1) * PAGE_SIZE + 1;
    const lastItemNumber = Math.min(page * PAGE_SIZE, total);

    return (
        <div className={s.pagination}>
            <span>{firstItemNumber}-{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onPreviousPage} disabled={isLoading || page <= 1}>
                    ←
                </Button>
                <span>{page} / {totalPages}</span>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onNextPage} disabled={isLoading || page >= totalPages}>
                    →
                </Button>
            </div>
        </div>
    );
});
