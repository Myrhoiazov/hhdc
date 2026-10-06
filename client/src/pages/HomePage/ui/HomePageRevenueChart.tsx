import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RevenueChartData, RevenueChartPeriod } from '../useHomePageData';
import cls from './HomePage.module.scss';

const chartPeriodLabels: Record<RevenueChartPeriod, string> = {
    year: 'Год',
    threeMonths: '3 месяца',
    month: 'Месяц',
    week: 'Неделя',
};

const chartPeriods: RevenueChartPeriod[] = ['year', 'threeMonths', 'month', 'week'];

const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(value);

const formatShortAmount = (value: number) => (
    new Intl.NumberFormat('nl-NL', {
        maximumFractionDigits: value % 1 ? 1 : 0,
    }).format(value)
);

const formatUpdatedAt = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

interface HomePageRevenueChartProps {
    chartPeriod: RevenueChartPeriod;
    onChartPeriodChange: (period: RevenueChartPeriod) => void;
    chartData?: RevenueChartData;
    isChartLoading: boolean;
    maxChartValue: number;
    onExportMonthlyRevenue: () => void;
}

const ChartPeriodTabs = ({ chartPeriod, onChartPeriodChange }: {
    chartPeriod: RevenueChartPeriod;
    onChartPeriodChange: (period: RevenueChartPeriod) => void;
}) => (
    <div className={cls.periodTabs}>
        {chartPeriods.map((period) => (
            <button
                key={period}
                type="button"
                className={`${cls.periodTab} ${chartPeriod === period ? cls.activePeriodTab : ''}`}
                onClick={() => onChartPeriodChange(period)}
            >
                {chartPeriodLabels[period]}
            </button>
        ))}
    </div>
);

const ChartMetaBlock = ({ chartData, onExportMonthlyRevenue }: {
    chartData?: RevenueChartData;
    onExportMonthlyRevenue: () => void;
}) => {
    const { t } = useTranslation('home');
    return (
        <VStack gap="16" className={cls.chartMeta}>
            <Button theme={ButtonTheme.OUTLINE} onClick={onExportMonthlyRevenue}>
                {t('CSV по месяцам')}
            </Button>
            <HStack gap="8" align="center">
                <span className={`${cls.legendDot} ${cls.incomeDot}`} />
                <Text text="Доход" size="s" />
                <span className={`${cls.legendDot} ${cls.expenseDot}`} />
                <Text text="Расход" size="s" />
            </HStack>
            <div className={cls.chartTotals}>
                <span>{t('Доход: {{amount}}', { amount: formatMoney(chartData?.incomeTotal ?? 0, 'EUR') })}</span>
                <span>{t('Расход: {{amount}}', { amount: formatMoney(chartData?.expenseTotal ?? 0, 'EUR') })}</span>
            </div>
            <HStack gap="8" align="center">
                <span className={cls.updatedDot} />
                <Text text={`Обновлено: ${formatUpdatedAt(chartData?.updatedAt)}`} size="s" className={cls.updatedText} />
            </HStack>
        </VStack>
    );
};

const ChartColumns = ({ items, maxChartValue }: { items: RevenueChartData['items']; maxChartValue: number }) => (
    <div className={cls.chartArea}>
        {items.map((item) => (
            <div key={item.key} className={cls.chartColumn}>
                <div className={cls.bars}>
                    <div className={cls.barGroup}>
                        <span className={cls.barValue}>{formatShortAmount(item.income)}</span>
                        <div
                            className={`${cls.bar} ${cls.incomeBar}`}
                            style={{ height: `${Math.max((item.income / maxChartValue) * 180, item.income ? 14 : 3)}px` }}
                        />
                    </div>
                    <div className={cls.barGroup}>
                        <span className={cls.barValue}>{formatShortAmount(item.expense)}</span>
                        <div
                            className={`${cls.bar} ${cls.expenseBar}`}
                            style={{ height: `${Math.max((item.expense / maxChartValue) * 180, item.expense ? 14 : 3)}px` }}
                        />
                    </div>
                </div>
                <span className={cls.chartLabel}>{item.label}</span>
            </div>
        ))}
    </div>
);

export const HomePageRevenueChart = memo((props: HomePageRevenueChartProps) => {
    const { chartPeriod, onChartPeriodChange, chartData, isChartLoading, maxChartValue, onExportMonthlyRevenue } = props;

    return (
        <Card padding="24" max shadow="shadowLight" className={`${cls.sectionCard} ${cls.revenueCard}`}>
            <VStack gap="16" max>
                <HStack justify="between" align="start" max className={cls.chartHeader}>
                    <VStack gap="16">
                        <Text title="Доход и расход по месяцам" size="m" bold />
                        <ChartPeriodTabs chartPeriod={chartPeriod} onChartPeriodChange={onChartPeriodChange} />
                    </VStack>
                    <ChartMetaBlock chartData={chartData} onExportMonthlyRevenue={onExportMonthlyRevenue} />
                </HStack>

                {isChartLoading && !chartData ? (
                    <Skeleton width="100%" height={220} border="12px" />
                ) : (
                    <ChartColumns items={chartData?.items ?? []} maxChartValue={maxChartValue} />
                )}
            </VStack>
        </Card>
    );
});
