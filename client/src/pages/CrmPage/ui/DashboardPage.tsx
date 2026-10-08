import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getDashboard } from '@/entities/crm';
import { getUserAuthData } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout, RequestState } from './common';
import { DashboardInsightsPanel } from './DashboardInsights';
import cls from './CrmPage.module.scss';

export const DashboardPage = memo(() => {
    const { t } = useTranslation();
    const dashboard = useResource(getDashboard);
    const canSeeFinance = (useSelector(getUserAuthData)?.permissions ?? []).includes('finance.read');
    return <CrmLayout title="Dashboard"><RequestState error={dashboard.error} loading={dashboard.loading} /><div className={cls.grid}>
        {Object.entries(dashboard.data || {}).map(([name, count]) => <section className={cls.panel} key={name}><h2>{t(name)}</h2><strong>{count}</strong></section>)}
    </div>{canSeeFinance && <DashboardInsightsPanel />}<section className={cls.panel}><h2>{t('Event operations')}</h2><Link to="/people">{t('Manage people')}</Link><Link to="/events">{t('Manage events')}</Link><Link to="/email">{t('Open inbox')}</Link></section></CrmLayout>;
});
