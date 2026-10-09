import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuditEntry, AuditFilters, AuditOptions, getAuditOptions, listAuditPage } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import { listStyles as own, Pager, useListFilters } from './ListTable';
import cls from './CrmPage.module.scss';

const NO_FILTERS: AuditFilters = { q: '', entityType: '', actorUserId: '', from: '', to: '' };
const NO_OPTIONS: AuditOptions = { entityTypes: [], actors: [] };

const useAuditList = () => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(() => listAuditPage(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};

interface FiltersProps { filters: AuditFilters; options: AuditOptions; filtered: boolean; onChange: (patch: Partial<AuditFilters>) => void; onReset: () => void }

const AuditFiltersBar = memo(({ filters, options, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    return <div className={own.filters}>
        <div className={own.search}><Field label="Search by action"><input type="search" value={filters.q} onChange={event => onChange({ q: event.target.value })} /></Field></div>
        <Field label="Record"><select value={filters.entityType} onChange={event => onChange({ entityType: event.target.value })}>
            <option value="">{t('Any record')}</option>
            {options.entityTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select></Field>
        <Field label="Staff member"><select value={filters.actorUserId} onChange={event => onChange({ actorUserId: event.target.value })}>
            <option value="">{t('Anyone')}</option>
            {options.actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name || actor.email}</option>)}
        </select></Field>
        <Field label="Period from"><input type="date" value={filters.from} max={filters.to || undefined} onChange={event => onChange({ from: event.target.value })} /></Field>
        <Field label="Period until"><input type="date" value={filters.to} min={filters.from || undefined} onChange={event => onChange({ to: event.target.value })} /></Field>
        <Button disabled={!filtered} onClick={onReset}>{t('Reset filters')}</Button>
    </div>;
});

const AuditRow = memo(({ entry }: { entry: AuditEntry }) => {
    const { t } = useTranslation();
    return <tr>
        <td className={own.secondary}><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></td>
        <td>{entry.actor ? entry.actor.name || entry.actor.email : <span className={own.secondary}>{t('System')}</span>}</td>
        <td><strong>{t(entry.action)}</strong></td>
        <td><span className={cls.badge}>{entry.entityType}</span></td>
        <td className={`${own.secondary} ${own.optional}`}>{entry.ipAddress || '—'}</td>
    </tr>;
});

const AuditTable = memo(({ entries }: { entries: AuditEntry[] }) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr><th>{t('When')}</th><th>{t('Who')}</th><th>{t('Action')}</th><th>{t('Record')}</th><th className={own.optional}>{t('IP address')}</th></tr></thead>
        <tbody>{entries.map(entry => <AuditRow key={entry.id} entry={entry} />)}</tbody>
    </table></div>;
});

export const AuditPage = memo(() => {
    const { t } = useTranslation();
    const audit = useAuditList();
    const options = useResource(getAuditOptions);
    const { data } = audit.list;
    return <CrmLayout title="Audit log">
        <AuditFiltersBar filters={audit.filters} options={options.data ?? NO_OPTIONS} filtered={audit.filtered} onChange={audit.change} onReset={audit.reset} />
        <section className={cls.panel} aria-label={t('All entries')}>
            <div className={own.summary}>
                <h2>{t('All entries')}</h2>
                {data && <span className={cls.muted}>{t('Entries found: {{count}}', { count: data.total })}</span>}
            </div>
            <RequestState error={audit.list.error || options.error} loading={audit.list.loading && !data} />
            {data && data.total > 0 && <AuditTable entries={data.data} />}
            {data?.total === 0 && <p className={cls.muted}>{t(audit.filtered ? 'No entries match the filters' : 'The audit log is empty')}</p>}
            {data && <Pager page={audit.page} total={data.total} onChange={audit.setPage} />}
        </section>
    </CrmLayout>;
});
