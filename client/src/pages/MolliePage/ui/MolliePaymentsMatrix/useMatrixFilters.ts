import { useCallback, useMemo, useState } from 'react';
import { MatrixRow } from './matrixTypes';
import { PaymentsMatrixResponse } from './useMatrixData';

export type PeriodMode = 'year' | 'month' | 'range';

export const useMatrixFilters = (data: PaymentsMatrixResponse | undefined) => {
    const [search, setSearch] = useState('');
    const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [monthFrom, setMonthFrom] = useState('');
    const [monthTo, setMonthTo] = useState('');

    const rows = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        if (!normalizedSearch) return data?.rows ?? [];

        return data?.rows.filter((row) => (
            [row.name, row.branch, ...row.payerNames]
                .filter(Boolean)
                .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
        )) ?? [];
    }, [data?.rows, search]);

    const monthOptions = useMemo(() => data?.months.map((month) => ({
        value: month.key,
        content: `${month.label} ${month.year}`,
    })) ?? [], [data?.months]);

    const visibleMonths = useMemo(() => {
        if (!data?.months.length || periodMode === 'year') return data?.months ?? [];
        if (periodMode === 'month') {
            return data.months.filter((month) => month.key === (selectedMonth || data.months[0].key));
        }

        const from = monthFrom || data.months[0].key;
        const to = monthTo || data.months[data.months.length - 1].key;
        const normalizedFrom = from <= to ? from : to;
        const normalizedTo = from <= to ? to : from;

        return data.months.filter((month) => month.key >= normalizedFrom && month.key <= normalizedTo);
    }, [data?.months, monthFrom, monthTo, periodMode, selectedMonth]);

    const getPaidMonths = useCallback((row: MatrixRow) => (
        visibleMonths.filter((month) => row.cells[month.key]?.paid).length
    ), [visibleMonths]);

    const paidStudents = rows.filter((row) => getPaidMonths(row) > 0).length;
    const totalPaidMonths = rows.reduce((total, row) => total + getPaidMonths(row), 0);

    return {
        search, setSearch, periodMode, setPeriodMode, selectedMonth, setSelectedMonth,
        monthFrom, setMonthFrom, monthTo, setMonthTo,
        rows, monthOptions, visibleMonths, getPaidMonths, paidStudents, totalPaidMonths,
    };
};
