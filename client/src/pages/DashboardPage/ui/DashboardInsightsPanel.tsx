import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDashboardInsights } from '@/entities/Dashboard';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Totals } from './Totals';
import { Years } from './Years';
import { Countries } from './Countries';

// What the events earned and cost, by year and event, and where the buyers come from.
export const DashboardInsightsPanel = memo(() => {
    const { t } = useTranslation();
    const insights = useResource(getDashboardInsights);
    return (
        <>
            <h2>{t('Money of the events')}</h2>
            <RequestState error={insights.error} loading={insights.loading && !insights.data} />
            {insights.data && (
                <>
                    <Totals data={insights.data} />
                    <Years data={insights.data} />
                    <Countries data={insights.data} />
                </>
            )}
        </>
    );
});
