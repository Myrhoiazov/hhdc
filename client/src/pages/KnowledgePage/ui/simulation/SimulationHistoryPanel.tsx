import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getSimulationRun,
    listSimulationRuns,
    SIMULATION_PAGE_SIZE,
    SimulationRun,
} from '@/entities/EmailSimulation';
import { formatDateTime } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { SimulationResult } from './SimulationResult';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Knowledge.module.scss';
import { HistoryTable } from './HistoryTable';
import { Pager } from '@/shared/ui/Pager';

const RunDetail = memo(({ run, onClose }: { run: SimulationRun; onClose: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={own.result} role="region" aria-label={t('Simulation run')}>
            <div className={cls.row}>
                <strong>{formatDateTime(run.createdAt)}</strong>
                <Button onClick={onClose}>{t('Close')}</Button>
            </div>
            <p className={cls.muted}>{`${run.fromAddress} — ${run.subject || t('No subject')}`}</p>
            <pre className={own.draft}>{run.body}</pre>
            {run.error && (
                <p role="alert" className={cls.error}>
                    {run.error}
                </p>
            )}
            {run.result && <SimulationResult simulation={run.result} />}
        </div>
    );
});

// `refreshKey` changes after every new run, so the newest one shows up without a reload.
export const SimulationHistoryPanel = memo(({ refreshKey }: { refreshKey: number }) => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [run, setRun] = useState<SimulationRun>();
    const [error, setError] = useState('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const load = useCallback(() => listSimulationRuns(page), [page, refreshKey]);
    const history = useResource(load);
    const open = useCallback((id: string) => {
        setError('');
        getSimulationRun(id)
            .then(setRun)
            .catch((cause) => setError(cause instanceof Error ? cause.message : 'Request failed'));
    }, []);
    return (
        <Panel aria-label={t('Simulation history')}>
            <h2>{t('Simulation history')}</h2>
            <RequestState error={error || history.error} loading={history.loading} />
            {history.data &&
                (history.data.total ? (
                    <>
                        <HistoryTable runs={history.data.data} onOpen={open} />
                        <Pager
                            page={page}
                            total={history.data.total}
                            pageSize={SIMULATION_PAGE_SIZE}
                            onChange={setPage}
                        />
                    </>
                ) : (
                    <p className={cls.muted}>{t('No simulations yet.')}</p>
                ))}
            {run && <RunDetail run={run} onClose={() => setRun(undefined)} />}
        </Panel>
    );
});
