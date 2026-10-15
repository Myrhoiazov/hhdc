import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AutomationTest, listAutomationRuns } from '@/entities/Automation';
import { formatDateTime } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from '@/shared/ui/layout/layout.module.scss';

export const TestReport = memo(({ report }: { report: AutomationTest }) => {
    const { t } = useTranslation();
    return (
        <div className={cls.result}>
            <p>
                {t(
                    report.matched
                        ? 'Conditions matched. Nothing was executed.'
                        : 'Conditions did not match the sample.'
                )}
            </p>
            <p className={cls.muted}>
                {t('Would execute')}: {report.sideEffects.join(', ')} ·{' '}
                {t('Trigger events in the last 30 days')}: {report.recentTriggerEvents}
            </p>
        </div>
    );
});

export const AutomationRuns = memo(({ id }: { id: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listAutomationRuns(id), [id]);
    const runs = useResource(load);
    return (
        <div>
            <RequestState error={runs.error} loading={runs.loading} />
            {runs.data?.total === 0 && <p className={cls.muted}>{t('No runs yet')}</p>}
            {runs.data?.data.map((run) => (
                <div className={cls.row} key={run.id}>
                    <time>{formatDateTime(run.startedAt)}</time>
                    <span>
                        {run.actionRuns
                            .map((item) => `${item.input.type}: ${item.status}`)
                            .join(' → ')}
                    </span>
                    <span>{run.error}</span>
                    <StatusBadge status={run.dryRun ? 'DRY_RUN' : run.status} />
                </div>
            ))}
        </div>
    );
});
