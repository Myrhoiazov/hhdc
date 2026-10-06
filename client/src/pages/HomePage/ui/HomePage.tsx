import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { useHomePageData } from '../useHomePageData';
import { HomePageKpiCards } from './HomePageKpiCards';
import { HomePageRevenueChart } from './HomePageRevenueChart';
import { HomePageFailedPayments } from './HomePageFailedPayments';
import cls from './HomePage.module.scss';

const HomePageHeader = ({ syncMessage, isSyncing, isLoading, onSyncMollie }: {
    syncMessage?: string;
    isSyncing: boolean;
    isLoading: boolean;
    onSyncMollie: () => void;
}) => {
    const { t } = useTranslation('home');
    return (
        <HStack justify="between" align="start" gap="16" max>
            <VStack gap="8">
                <Text title={t('CRM Dashboard')} size="l" bold />
                <Text text="Обзор автосписаний Mollie и состояния учеников по оплатам." />
                {syncMessage && <Text text={syncMessage} variant="accent" />}
            </VStack>
            <Button
                onClick={onSyncMollie}
                disabled={isSyncing || isLoading}
                theme={ButtonTheme.BACKGROUND_INVERTED}
            >
                {isSyncing ? 'Синхронизация...' : 'Sync Mollie'}
            </Button>
        </HStack>
    );
};

const HomePage = () => {
    const {
        summary,
        isLoading,
        isSyncing,
        chartPeriod,
        setChartPeriod,
        chartData,
        isChartLoading,
        error,
        syncMessage,
        maxChartValue,
        onSyncMollie,
        onExportMonthlyRevenue,
    } = useHomePageData();

    return (
        <Page>
            <VStack gap="24" className={cls.HomePage} max>
                <HomePageHeader
                    syncMessage={syncMessage}
                    isSyncing={isSyncing}
                    isLoading={isLoading}
                    onSyncMollie={onSyncMollie}
                />

                <HomePageKpiCards summary={summary} isLoading={isLoading} />

                {error && <Text text={error} variant="error" />}

                <HomePageRevenueChart
                    chartPeriod={chartPeriod}
                    onChartPeriodChange={setChartPeriod}
                    chartData={chartData}
                    isChartLoading={isChartLoading}
                    maxChartValue={maxChartValue}
                    onExportMonthlyRevenue={onExportMonthlyRevenue}
                />

                <HomePageFailedPayments summary={summary} />
            </VStack>
        </Page>
    );
};

export default HomePage;
