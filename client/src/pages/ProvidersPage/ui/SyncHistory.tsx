import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listSyncRuns, SyncRun } from '@/entities/Provider';
import { formatDateTime } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { listStyles as table } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './WeeztixData.module.scss';

const RunRow = memo(({ run }: { run: SyncRun }) => {
    const { t } = useTranslation();
    return (
        <tr>
            <td className={table.secondary}>
                <time dateTime={run.startedAt}>{formatDateTime(run.startedAt)}</time>
            </td>
            <td>
                {t(`Sync scope: ${run.metadata.scope ?? 'OTHER'}`, {
                    defaultValue: run.metadata.scope ?? run.type,
                })}
            </td>
            <td>
                <StatusBadge status={run.status} />
            </td>
            <td className={table.number}>{run.createdCount}</td>
            <td className={table.number}>{run.updatedCount}</td>
            <td className={`${table.number} ${table.optional}`}>{run.skippedCount}</td>
            <td className={table.number}>{run.failedCount}</td>
            <td className={`${table.secondary} ${table.optional}`}>{run.errorSummary || '—'}</td>
        </tr>
    );
});

// The latest runs, opened on demand: the list is read when the history is unfolded and after a sync.
export const SyncHistory = memo(
    ({ connectionId, version }: { connectionId: string; version: number }) => {
        const { t } = useTranslation();
        const [open, setOpen] = useState(false);
        // A new `version` makes a new request, so the list is read again after every sync.
        const request = useMemo(() => ({ connectionId, version }), [connectionId, version]);
        const load = useCallback(
            () => (open ? listSyncRuns(request.connectionId) : Promise.resolve(undefined)),
            [request, open]
        );
        const runs = useResource(load);
        return (
            <details
                className={own.history}
                onToggle={(event) => setOpen(event.currentTarget.open)}
            >
                <summary>{t('Sync history')}</summary>
                {runs.error && (
                    <p role="alert" className={cls.error}>
                        {runs.error}
                    </p>
                )}
                {runs.data?.length === 0 && <p className={cls.muted}>{t('No sync has run yet')}</p>}
                {runs.data && runs.data.length > 0 && (
                    <div className={table.tableScroll}>
                        <table className={table.table}>
                            <thead>
                                <tr>
                                    <th>{t('When')}</th>
                                    <th>{t('What was read')}</th>
                                    <th>{t('Status')}</th>
                                    <th className={table.number}>{t('New')}</th>
                                    <th className={table.number}>{t('Changed')}</th>
                                    <th className={`${table.number} ${table.optional}`}>
                                        {t('Unchanged')}
                                    </th>
                                    <th className={table.number}>{t('Failed')}</th>
                                    <th className={table.optional}>{t('Error')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.data.map((run) => (
                                    <RunRow key={run.id} run={run} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </details>
        );
    }
);
