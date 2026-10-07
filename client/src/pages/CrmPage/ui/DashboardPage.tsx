import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDashboard, listAudit } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout, RequestState } from './common';
import cls from './CrmPage.module.scss';

export const DashboardPage = memo(() => {
    const { t } = useTranslation();
    const dashboard = useResource(getDashboard);
    return <CrmLayout title="Dashboard"><RequestState error={dashboard.error} loading={dashboard.loading} /><div className={cls.grid}>
        {Object.entries(dashboard.data || {}).map(([name, count]) => <section className={cls.panel} key={name}><h2>{t(name)}</h2><strong>{count}</strong></section>)}
    </div><section className={cls.panel}><h2>{t('Event operations')}</h2><Link to="/people">{t('Manage people')}</Link><Link to="/events">{t('Manage events')}</Link><Link to="/email">{t('Open inbox')}</Link></section></CrmLayout>;
});

export const AuditPage = memo(() => {
    const { t } = useTranslation();
    const audit = useResource(listAudit);
    return <CrmLayout title="Audit log"><RequestState error={audit.error} loading={audit.loading} /><section className={cls.panel}>{audit.data?.data.map(item => <div className={cls.row} key={item.id}><span>{t(item.action)}</span><span>{item.entityType}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</section></CrmLayout>;
});
