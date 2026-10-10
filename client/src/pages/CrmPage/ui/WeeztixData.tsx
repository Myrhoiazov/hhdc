import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { importWeeztixContacts, listSyncRuns, previewWeeztixContacts, SyncRun, syncWeeztixCatalog, syncWeeztixSales, WeeztixContactsResult } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from './common';
import { listStyles as table } from './ListTable';
import cls from './CrmPage.module.scss';
import own from './WeeztixData.module.scss';

// A record Weeztix returned but the CRM could not read counts as failed: it was not saved.
const withUnreadable = <Result extends { failed: number; unreadable: number }>(result: Result): Result => ({ ...result, failed: result.failed + result.unreadable });

// Contacts are imported in two steps: the check shows what would happen and writes nothing,
// the import is offered only after it.
const useWeeztixData = (connectionId: string) => {
    const { t } = useTranslation();
    const [notice, setNotice] = useState('');
    const [preview, setPreview] = useState<WeeztixContactsResult>();
    const action = useAction();
    // Counts finished actions, so the history knows when to be read again.
    const [runs, setRuns] = useState(0);
    const run = (work: () => Promise<string>) => { setNotice(''); void action.run(async () => { try { setNotice(await work()); } finally { setRuns(count => count + 1); } }); };
    return {
        notice,
        runs,
        preview,
        busy: action.busy,
        error: action.error,
        syncCatalog: () => run(async () => t('Events: {{events}} (new: {{created}}, updated: {{updated}}), ticket types: {{ticketTypes}}, failed: {{failed}}', { ...withUnreadable(await syncWeeztixCatalog(connectionId)) })),
        syncSales: () => run(async () => {
            const { sales } = await syncWeeztixSales(connectionId);
            const summary = t('Orders: {{orders}} (new: {{created}}, updated: {{updated}}), tickets: {{tickets}}, new registrations: {{registrations}}, new people: {{newPeople}}, failed: {{failed}}', { ...withUnreadable(sales) });
            return sales.firstError ? `${summary}. ${t('First error: {{error}}', { error: sales.firstError })}` : summary;
        }),
        checkContacts: () => run(async () => { setPreview(await previewWeeztixContacts(connectionId)); return ''; }),
        importContacts: () => run(async () => {
            const result = await importWeeztixContacts(connectionId);
            setPreview(undefined);
            return t('Contacts imported. New people: {{created}}, matched by email: {{linked}}, failed: {{failed}}', { ...result });
        }),
    };
};

const ContactsPreview = memo(({ preview, busy, onImport }: { preview: WeeztixContactsResult; busy: boolean; onImport: () => void }) => {
    const { t } = useTranslation();
    const pending = preview.created + preview.linked;
    return <div aria-label={t('Check contacts')} role="group">
        <p>{t('Buyers in Weeztix: {{contacts}} (orders: {{orders}}). New people: {{created}}, matched to people already in the CRM by email: {{linked}}, already imported: {{known}}, skipped because several people share the email: {{ambiguous}}.', { ...preview })}</p>
        {pending > 0
            ? <div className={cls.actions}><Button disabled={busy} onClick={onImport}>{t('Import {{count}} contacts', { count: pending })}</Button></div>
            : <p className={cls.muted}>{t('Nothing new to import')}</p>}
    </div>;
});

const RunRow = memo(({ run }: { run: SyncRun }) => {
    const { t } = useTranslation();
    return <tr>
        <td className={table.secondary}><time dateTime={run.startedAt}>{new Date(run.startedAt).toLocaleString()}</time></td>
        <td>{t(`Sync scope: ${run.metadata.scope ?? 'OTHER'}`, { defaultValue: run.metadata.scope ?? run.type })}</td>
        <td><StatusBadge status={run.status} /></td>
        <td className={table.number}>{run.createdCount}</td><td className={table.number}>{run.updatedCount}</td>
        <td className={`${table.number} ${table.optional}`}>{run.skippedCount}</td><td className={table.number}>{run.failedCount}</td>
        <td className={`${table.secondary} ${table.optional}`}>{run.errorSummary || '—'}</td>
    </tr>;
});

// The latest runs, opened on demand: the list is read when the history is unfolded and after a sync.
const SyncHistory = memo(({ connectionId, version }: { connectionId: string; version: number }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    // A new `version` makes a new request, so the list is read again after every sync.
    const request = useMemo(() => ({ connectionId, version }), [connectionId, version]);
    const load = useCallback(() => (open ? listSyncRuns(request.connectionId) : Promise.resolve(undefined)), [request, open]);
    const runs = useResource(load);
    return <details className={own.history} onToggle={event => setOpen(event.currentTarget.open)}>
        <summary>{t('Sync history')}</summary>
        {runs.error && <p role="alert" className={cls.error}>{runs.error}</p>}
        {runs.data?.length === 0 && <p className={cls.muted}>{t('No sync has run yet')}</p>}
        {runs.data && runs.data.length > 0 && <div className={table.tableScroll}><table className={table.table}>
            <thead><tr>
                <th>{t('When')}</th><th>{t('What was read')}</th><th>{t('Status')}</th><th className={table.number}>{t('New')}</th><th className={table.number}>{t('Changed')}</th>
                <th className={`${table.number} ${table.optional}`}>{t('Unchanged')}</th><th className={table.number}>{t('Failed')}</th><th className={table.optional}>{t('Error')}</th>
            </tr></thead>
            <tbody>{runs.data.map(run => <RunRow key={run.id} run={run} />)}</tbody>
        </table></div>}
    </details>;
});

export const WeeztixData = memo(({ connectionId }: { connectionId: string }) => {
    const { t } = useTranslation();
    const data = useWeeztixData(connectionId);
    return <div className={own.WeeztixData} aria-label={t('Data from Weeztix')} role="group">
        <div className={own.intro}>
            <h3>{t('Data from Weeztix')}</h3>
            <p className={cls.muted}>{t('New orders, events and prices are read from Weeztix automatically every few minutes. The buttons read them right now.')}</p>
        </div>
        <div className={cls.actions}>
            <Button disabled={data.busy} onClick={data.syncCatalog}>{t('Sync events and prices')}</Button>
            <Button disabled={data.busy} onClick={data.syncSales}>{t('Sync orders and tickets')}</Button>
            <Button disabled={data.busy} onClick={data.checkContacts}>{t('Check contacts')}</Button>
        </div>
        {data.preview && <ContactsPreview preview={data.preview} busy={data.busy} onImport={data.importContacts} />}
        {data.busy && <p className={cls.muted}>{t('Reading Weeztix. A full sync takes up to a minute.')}</p>}
        {data.notice && <p role="status">{data.notice}</p>}
        {data.error && <p role="alert" className={cls.error}>{data.error}</p>}
        <SyncHistory connectionId={connectionId} version={data.runs} />
    </div>;
});
