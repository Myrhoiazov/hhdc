import { useCallback, useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { RevenueChartData, RevenueChartPeriod } from './homePageTypes';

export const useRevenueChart = () => {
    const [chartPeriod, setChartPeriod] = useState<RevenueChartPeriod>('week');
    const [chartData, setChartData] = useState<RevenueChartData>();
    const [isChartLoading, setIsChartLoading] = useState(false);

    const fetchRevenueChart = useCallback(async (period: RevenueChartPeriod) => {
        setIsChartLoading(true);
        try {
            const { data } = await $apiPrivate.get<RevenueChartData>('/transactions/chart', { params: { period } });
            setChartData(data);
        } finally {
            setIsChartLoading(false);
        }
    }, []);

    useEffect(() => { fetchRevenueChart(chartPeriod); }, [chartPeriod, fetchRevenueChart]);

    const onExportMonthlyRevenue = useCallback(async () => {
        const response = await $apiPrivate.get('/transactions/revenue/export.csv', { responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'monthly-revenue.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, []);

    const maxChartValue = useMemo(() => {
        const values = chartData?.items.flatMap((item) => [item.income, item.expense]) ?? [];
        return Math.max(...values, 0) || 1;
    }, [chartData]);

    return {
        chartPeriod, setChartPeriod, chartData, isChartLoading, maxChartValue, onExportMonthlyRevenue,
    };
};
