import { useMollieSummary } from './useMollieSummary';
import { useRevenueChart } from './useRevenueChart';

export type {
    FailedPaymentCustomer, FailedPayment, MollieDashboardSummary, RevenueChartPeriod, RevenueChartItem, RevenueChartData,
} from './homePageTypes';

export const useHomePageData = () => {
    const summary = useMollieSummary();
    const chart = useRevenueChart();

    return {
        ...summary,
        ...chart,
    };
};
