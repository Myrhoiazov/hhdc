import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { MatrixMonth, PeriodMode, periodModeOptions, yearOptions } from './useMolliePaymentsMatrix';
import s from './MolliePaymentsMatrix.module.scss';

interface MolliePaymentsMatrixToolbarProps {
    startYear: string;
    onStartYearChange: (value: string) => void;
    periodMode: PeriodMode;
    onPeriodModeChange: (value: PeriodMode) => void;
    selectedMonth: string;
    onSelectedMonthChange: (value: string) => void;
    monthFrom: string;
    onMonthFromChange: (value: string) => void;
    monthTo: string;
    onMonthToChange: (value: string) => void;
    monthOptions: SelectOption<string>[];
    months?: MatrixMonth[];
    search: string;
    onSearchChange: (value: string) => void;
    visibleMonthsCount: number;
    rowsCount: number;
    paidStudents: number;
    totalPaidMonths: number;
}

const PeriodSelectors = ({
    periodMode,
    selectedMonth,
    monthFrom,
    monthTo,
    monthOptions,
    months,
    onSelectedMonthChange,
    onMonthFromChange,
    onMonthToChange,
}: {
    periodMode: PeriodMode;
    selectedMonth: string;
    monthFrom: string;
    monthTo: string;
    monthOptions: SelectOption<string>[];
    months?: MatrixMonth[];
    onSelectedMonthChange: (value: string) => void;
    onMonthFromChange: (value: string) => void;
    onMonthToChange: (value: string) => void;
}) => (
    <>
        {periodMode === 'month' && (
            <Select
                label="Месяц"
                value={selectedMonth || months?.[0]?.key}
                options={monthOptions}
                onChange={onSelectedMonthChange}
            />
        )}
        {periodMode === 'range' && (
            <>
                <Select
                    label="С месяца"
                    value={monthFrom || months?.[0]?.key}
                    options={monthOptions}
                    onChange={onMonthFromChange}
                />
                <Select
                    label="По месяц"
                    value={monthTo || months?.[months.length - 1]?.key}
                    options={monthOptions}
                    onChange={onMonthToChange}
                />
            </>
        )}
    </>
);

const MatrixSummary = ({
    visibleMonthsCount,
    rowsCount,
    paidStudents,
    totalPaidMonths,
}: {
    visibleMonthsCount: number;
    rowsCount: number;
    paidStudents: number;
    totalPaidMonths: number;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.summary}>
            <span><b>{visibleMonthsCount}</b>{t(' мес.')}</span>
            <span><b>{rowsCount}</b>{t(' строк')}</span>
            <span><b>{paidStudents}</b>{t(' с оплатами')}</span>
            <span><b>{totalPaidMonths}</b>{t(' оплаченных месяцев')}</span>
        </div>
    );
};

export const MolliePaymentsMatrixToolbar = memo((props: MolliePaymentsMatrixToolbarProps) => {
    const {
        startYear, onStartYearChange, periodMode, onPeriodModeChange,
        selectedMonth, onSelectedMonthChange, monthFrom, onMonthFromChange, monthTo, onMonthToChange,
        monthOptions, months, search, onSearchChange,
        visibleMonthsCount, rowsCount, paidStudents, totalPaidMonths,
    } = props;

    return (
        <div className={s.toolbar}>
            <Select label="Учебный год" value={startYear} options={yearOptions} onChange={onStartYearChange} />
            <Select<PeriodMode> label="Просмотр" value={periodMode} options={periodModeOptions} onChange={onPeriodModeChange} />
            <PeriodSelectors
                periodMode={periodMode} selectedMonth={selectedMonth} monthFrom={monthFrom} monthTo={monthTo}
                monthOptions={monthOptions} months={months}
                onSelectedMonthChange={onSelectedMonthChange} onMonthFromChange={onMonthFromChange}
                onMonthToChange={onMonthToChange}
            />
            <Input label="Поиск" placeholder="Ученик, плательщик или филиал" value={search} onChange={onSearchChange} fullWidth />
            <MatrixSummary
                visibleMonthsCount={visibleMonthsCount} rowsCount={rowsCount}
                paidStudents={paidStudents} totalPaidMonths={totalPaidMonths}
            />
        </div>
    );
});
