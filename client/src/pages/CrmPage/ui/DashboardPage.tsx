import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDashboard } from '@/entities/Dashboard';
import { useCan } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { DashboardInsightsPanel } from './DashboardInsights';
import cls from '@/shared/ui/layout/layout.module.scss';

export const DashboardPage = memo(() => {
    const { t } = useTranslation();
    const dashboard = useResource(getDashboard);
    const canSeeFinance = useCan()('finance.read');
    return <CrmLayout title="Dashboard"><RequestState error={dashboard.error} loading={dashboard.loading} /><div className={cls.grid}>
        {Object.entries(dashboard.data || {}).map(([name, count]) => <Panel key={name}><h2>{t(name)}</h2><strong>{count}</strong></Panel>)}
    </div>{canSeeFinance && <DashboardInsightsPanel />}<Panel><h2>{t('Event operations')}</h2><Link to="/people">{t('Manage people')}</Link><Link to="/events">{t('Manage events')}</Link><Link to="/email">{t('Open inbox')}</Link></Panel></CrmLayout>;
});
