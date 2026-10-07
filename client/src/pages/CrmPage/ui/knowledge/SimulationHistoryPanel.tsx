import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSimulationRun, listSimulationRuns, SIMULATION_PAGE_SIZE, SimulationRun, SimulationRunSummary } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { RequestState, StatusBadge } from '../common';
import { SimulationResult } from './SimulationResult';
import cls from '../CrmPage.module.scss';
import own from './Knowledge.module.scss';

const HistoryRow = memo(({ run, onOpen }: { run: SimulationRunSummary; onOpen: (id: string) => void }) => {
    const { t } = useTranslation();
    return <tr>
        <td>{new Date(run.createdAt).toLocaleString()}</td>
        <td><Button theme={ButtonTheme.CLEAR} className={own.rowLink} onClick={() => onOpen(run.id)}>{run.subject || run.preview}</Button></td>
        <td>{run.model ? `${run.provider ?? ''}/${run.model}` : '—'}</td>
        <td>{run.totalTokens}</td>
        <td>{`${run.durationMs} ${t('ms')}`}</td>
        <td><StatusBadge status={run.status} /></td>
    </tr>;
});

const HistoryTable = memo(({ runs, onOpen }: { runs: SimulationRunSummary[]; onOpen: (id: string) => void }) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Date')}</th><th>{t('Email')}</th><th>{t('Model')}</th><th>{t('Tokens')}</th><th>{t('Duration')}</th><th>{t('Outcome')}</th>
        </tr></thead>
        <tbody>{runs.map((run) => <HistoryRow key={run.id} run={run} onOpen={onOpen} />)}</tbody>
    </table></div>;
});

const Pager = memo(({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) => {
    const { t } = useTranslation();
    const pages = Math.max(1, Math.ceil(total / SIMULATION_PAGE_SIZE));
    return <div className={cls.actions}>
        <Button disabled={page <= 1} aria-label={t('Previous page')} onClick={() => onChange(page - 1)}>←</Button>
        <span className={cls.muted}>{`${page} / ${pages}`}</span>
        <Button disabled={page >= pages} aria-label={t('Next page')} onClick={() => onChange(page + 1)}>→</Button>
    </div>;
});

const RunDetail = memo(({ run, onClose }: { run: SimulationRun; onClose: () => void }) => {
    const { t } = useTranslation();
    return <div className={own.result} role="region" aria-label={t('Simulation run')}>
        <div className={cls.row}><strong>{new Date(run.createdAt).toLocaleString()}</strong><Button onClick={onClose}>{t('Close')}</Button></div>
        <p className={cls.muted}>{`${run.fromAddress} — ${run.subject || t('No subject')}`}</p>
        <pre className={own.draft}>{run.body}</pre>
        {run.error && <p role="alert" className={cls.error}>{run.error}</p>}
        {run.result && <SimulationResult simulation={run.result} />}
    </div>;
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
        getSimulationRun(id).then(setRun).catch((cause) => setError(cause instanceof Error ? cause.message : 'Request failed'));
    }, []);
    return <section className={cls.panel} aria-label={t('Simulation history')}>
        <h2>{t('Simulation history')}</h2>
        <RequestState error={error || history.error} loading={history.loading} />
        {history.data && (history.data.total
            ? <><HistoryTable runs={history.data.data} onOpen={open} /><Pager page={page} total={history.data.total} onChange={setPage} /></>
            : <p className={cls.muted}>{t('No simulations yet.')}</p>)}
        {run && <RunDetail run={run} onClose={() => setRun(undefined)} />}
    </section>;
});
