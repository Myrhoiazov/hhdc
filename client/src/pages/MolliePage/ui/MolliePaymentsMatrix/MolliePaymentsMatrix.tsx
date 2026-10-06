import { memo } from 'react';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { useMolliePaymentsMatrix } from './useMolliePaymentsMatrix';
import { MolliePaymentsMatrixToolbar } from './MolliePaymentsMatrixToolbar';
import { MolliePaymentsMatrixUpcoming } from './MolliePaymentsMatrixUpcoming';
import { MolliePaymentsMatrixTable } from './MolliePaymentsMatrixTable';
import s from './MolliePaymentsMatrix.module.scss';

const MatrixHeader = ({ isSyncing, onSync }: { isSyncing: boolean; onSync: () => void }) => (
    <HStack max justify="between" align="center" gap="16" className={s.header}>
        <div>
            <Text title="Матрица платежей" size="m" bold />
            <Text
                text="Оплаты учеников по месяцам учебного года. Аналог DDC Payments Matrix."
                size="s"
                className={s.subtitle}
            />
        </div>
        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSync} disabled={isSyncing}>
            {isSyncing ? 'Sync...' : 'Sync payments'}
        </Button>
    </HStack>
);

export const MolliePaymentsMatrix = memo(() => {
    const {
        data, upcoming, startYear, setStartYear, search, setSearch, periodMode, setPeriodMode,
        selectedMonth, setSelectedMonth, monthFrom, setMonthFrom, monthTo, setMonthTo,
        upcomingMonth, setUpcomingMonth, isLoading, isUpcomingLoading, isSyncing, error, onSync,
        rows, monthOptions, visibleMonths, getPaidMonths, paidStudents, totalPaidMonths, upcomingMonthOptions,
    } = useMolliePaymentsMatrix();

    return (
        <VStack gap="16" max className={s.matrixPage}>
            <MatrixHeader isSyncing={isSyncing} onSync={onSync} />

            <MolliePaymentsMatrixToolbar
                startYear={startYear} onStartYearChange={setStartYear}
                periodMode={periodMode} onPeriodModeChange={setPeriodMode}
                selectedMonth={selectedMonth} onSelectedMonthChange={setSelectedMonth}
                monthFrom={monthFrom} onMonthFromChange={setMonthFrom} monthTo={monthTo} onMonthToChange={setMonthTo}
                monthOptions={monthOptions} months={data?.months} search={search} onSearchChange={setSearch}
                visibleMonthsCount={visibleMonths.length} rowsCount={rows.length}
                paidStudents={paidStudents} totalPaidMonths={totalPaidMonths}
            />

            <MolliePaymentsMatrixUpcoming
                upcomingMonth={upcomingMonth} onUpcomingMonthChange={setUpcomingMonth}
                upcomingMonthOptions={upcomingMonthOptions} total={upcoming?.total ?? 0} amount={upcoming?.amount ?? 0}
                currency={upcoming?.currency} isLoading={isUpcomingLoading} items={upcoming?.items ?? []}
            />

            {error && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Не удалось загрузить матрицу" text="Проверьте сервер или синхронизируйте Mollie payments." size="m" />
                </Card>
            )}

            {isLoading && !data && <Skeleton width="100%" height={420} border="16px" />}

            {!isLoading && !error && data && (
                <MolliePaymentsMatrixTable rows={rows} visibleMonths={visibleMonths} getPaidMonths={getPaidMonths} />
            )}
        </VStack>
    );
});
