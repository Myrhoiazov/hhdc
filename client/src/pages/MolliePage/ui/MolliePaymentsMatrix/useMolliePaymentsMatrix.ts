import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { SelectOption } from '@/shared/ui/Select/Select';
import { MatrixMonth, MatrixCell, MatrixRow } from './matrixTypes';
import { useMatrixData } from './useMatrixData';
import { useUpcomingSubscriptions, UpcomingSubscription } from './useUpcomingSubscriptions';
import { useMatrixFilters, PeriodMode } from './useMatrixFilters';

export type { MatrixMonth, MatrixCell, MatrixRow };
export type { UpcomingSubscription };
export type { PeriodMode };

const now = new Date();
const defaultStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
export const yearOptions = Array.from({ length: 7 }, (_, index) => defaultStartYear + 1 - index).map((year) => ({
    value: String(year),
    content: `${year} / ${year + 1}`,
}));
export const periodModeOptions: SelectOption<PeriodMode>[] = [
    { value: 'year', content: 'Весь учебный год' },
    { value: 'month', content: 'Один месяц' },
    { value: 'range', content: 'Период' },
];

export const formatAmount = (cell: MatrixCell) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: cell.currency || 'EUR',
    maximumFractionDigits: 0,
}).format(cell.amount);
export const formatCurrency = (value: string | number, currency = 'EUR') => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(Number(value));
const currentMonthKey = now.toISOString().slice(0, 7);

export const useMolliePaymentsMatrix = () => {
    const [startYear, setStartYear] = useState(String(defaultStartYear));
    const [upcomingMonth, setUpcomingMonth] = useState(currentMonthKey);
    const [isSyncing, setIsSyncing] = useState(false);
    const [upcomingReloadKey, setUpcomingReloadKey] = useState(0);

    const { data, isLoading, error, loadMatrix } = useMatrixData(startYear);
    const { upcoming, isUpcomingLoading } = useUpcomingSubscriptions(upcomingMonth, upcomingReloadKey);
    const filters = useMatrixFilters(data);

    const onSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            await Promise.all([
                $apiPrivate.post('/mollie/sync/payments'),
                $apiPrivate.post('/mollie/sync/subscriptions'),
            ]);
            await loadMatrix();
            setUpcomingReloadKey((value) => value + 1);
            toast.success('Матрица платежей обновлена');
        } catch {
            toast.error('Не удалось синхронизировать платежи');
        } finally {
            setIsSyncing(false);
        }
    }, [loadMatrix]);

    const upcomingMonthOptions = useMemo(() => (
        filters.monthOptions.some((option) => option.value === currentMonthKey)
            ? filters.monthOptions
            : [
                { value: currentMonthKey, content: now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) },
                ...filters.monthOptions,
            ]
    ), [filters.monthOptions]);

    return {
        data,
        upcoming,
        startYear, setStartYear,
        ...filters,
        upcomingMonth, setUpcomingMonth,
        isLoading,
        isUpcomingLoading,
        isSyncing,
        error,
        onSync,
        upcomingMonthOptions,
    };
};
