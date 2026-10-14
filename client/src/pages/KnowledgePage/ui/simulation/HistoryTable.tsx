import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SimulationRunSummary } from '@/entities/EmailSimulation';
import { formatDateTime } from '@/shared/lib/format/date';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import own from '../Knowledge.module.scss';

const HistoryRow = memo(
    ({ run, onOpen }: { run: SimulationRunSummary; onOpen: (id: string) => void }) => {
        const { t } = useTranslation();
        return (
            <tr>
                <td>{formatDateTime(run.createdAt)}</td>
                <td>
                    <Button
                        theme={ButtonTheme.CLEAR}
                        className={own.rowLink}
                        onClick={() => onOpen(run.id)}
                    >
                        {run.subject || run.preview}
                    </Button>
                </td>
                <td>{run.model ? `${run.provider ?? ''}/${run.model}` : '—'}</td>
                <td>{run.totalTokens}</td>
                <td>{`${run.durationMs} ${t('ms')}`}</td>
                <td>
                    <StatusBadge status={run.status} />
                </td>
            </tr>
        );
    }
);

export const HistoryTable = memo(
    ({ runs, onOpen }: { runs: SimulationRunSummary[]; onOpen: (id: string) => void }) => {
        const { t } = useTranslation();
        return (
            <div className={own.tableScroll}>
                <table className={own.table}>
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Email')}</th>
                            <th>{t('Model')}</th>
                            <th>{t('Tokens')}</th>
                            <th>{t('Duration')}</th>
                            <th>{t('Outcome')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.map((run) => (
                            <HistoryRow key={run.id} run={run} onOpen={onOpen} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
);
