import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getOperationsHealth } from '@/entities/Operations';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const HEALTH_LABELS: [
    string,
    'failedJobs' | 'failedOutbox' | 'pendingOutbox' | 'failedWebhooks' | 'failedAutomationRuns',
][] = [
    ['Failed jobs (24h)', 'failedJobs'],
    ['Failed background events', 'failedOutbox'],
    ['Queued background events', 'pendingOutbox'],
    ['Failed webhook deliveries', 'failedWebhooks'],
    ['Failed automation runs (24h)', 'failedAutomationRuns'],
];

export const HealthPanel = memo(() => {
    const { t } = useTranslation();
    const health = useResource(getOperationsHealth);
    return (
        <Panel>
            <h2>{t('Integration health')}</h2>
            <RequestState error={health.error} loading={health.loading} />
            {health.data &&
                HEALTH_LABELS.map(([label, key]) => (
                    <div className={cls.row} key={key}>
                        <span>{t(label)}</span>
                        <strong>{health.data?.[key]}</strong>
                    </div>
                ))}
            {health.data?.providers.map((item) => (
                <div className={cls.row} key={item.id}>
                    <span>{item.name}</span>
                    <span className={cls.error}>{item.lastError}</span>
                    <StatusBadge status={item.status} />
                </div>
            ))}
        </Panel>
    );
});
