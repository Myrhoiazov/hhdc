import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import s from './MollieCustomers.module.scss';

interface MollieCustomersPaginationProps {
    isLoading: boolean;
    error: unknown;
    total: number;
    page: number;
    totalPages: number;
    firstItemNumber: number;
    lastItemNumber: number;
    onPrevious: () => void;
    onNext: () => void;
}

export const MollieCustomersPagination = memo(({
    isLoading, error, total, page, totalPages, firstItemNumber, lastItemNumber, onPrevious, onNext,
}: MollieCustomersPaginationProps) => {
    const { t } = useTranslation();
    if (error || total <= 0) return null;

    return (
        <div className={s.pagination}>
            <span className={s.paginationMeta}>
                {firstItemNumber}-{lastItemNumber}{t(' из ')}{total}
            </span>
            <div className={s.paginationActions}>
                <Button className={s.pageButton} theme={ButtonTheme.CLEAR} onClick={onPrevious} disabled={isLoading || page <= 1}>←</Button>
                <span className={s.pageMeta}>{page} / {totalPages}</span>
                <Button className={s.pageButton} theme={ButtonTheme.CLEAR} onClick={onNext} disabled={isLoading || page >= totalPages}>→</Button>
            </div>
        </div>
    );
});
