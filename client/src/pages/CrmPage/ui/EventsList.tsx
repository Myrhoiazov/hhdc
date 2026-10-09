import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createEvent, Event, EVENT_STATUSES, EventFilters, listEventsPage } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from './common';
import { listStyles as own, Pager, useListFilters } from './ListTable';
import cls from './CrmPage.module.scss';

const NO_FILTERS: EventFilters = { q: '', status: '', period: '' };

const EventForm = memo(({ onSaved }: { onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setSaving(true);
        try {
            await createEvent({ name: String(values.get('name')), slug: String(values.get('slug')), startAt: new Date(String(values.get('startAt'))).toISOString(), endAt: new Date(String(values.get('endAt'))).toISOString(), timezone: String(values.get('timezone')), venueName: String(values.get('venueName')), capacity: values.get('capacity') ? Number(values.get('capacity')) : null });
            form.reset(); onSaved();
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setSaving(false); }
    };
    return <form className={cls.panel} onSubmit={submit}><h2>{t('Create event')}</h2><div className={cls.grid}>
        <Field label="Name"><input name="name" required /></Field>
        <Field label="Slug"><input name="slug" pattern="[a-z0-9-]+" required /></Field>
        <Field label="Starts at"><input name="startAt" type="datetime-local" required /></Field>
        <Field label="Ends at"><input name="endAt" type="datetime-local" required /></Field>
        <Field label="Timezone"><input name="timezone" defaultValue="Europe/Amsterdam" required /></Field>
        <Field label="Venue"><input name="venueName" /></Field>
        <Field label="Capacity"><input name="capacity" type="number" min="1" /></Field>
    </div><RequestState error={error} loading={false} /><Button type="submit" disabled={saving}>{t('Save')}</Button></form>;
});

// One date for a one-day event, a range otherwise.
const eventDates = (event: Event): string => {
    const [start, end] = [new Date(event.startAt).toLocaleDateString(), new Date(event.endAt).toLocaleDateString()];
    return start === end ? start : `${start} – ${end}`;
};

const useEventsList = () => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(() => listEventsPage(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};

interface FiltersProps { filters: EventFilters; filtered: boolean; onChange: (patch: Partial<EventFilters>) => void; onReset: () => void }

const EventFiltersBar = memo(({ filters, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    return <div className={own.filters}>
        <div className={own.search}><Field label="Search by name, venue or city"><input type="search" value={filters.q} onChange={event => onChange({ q: event.target.value })} /></Field></div>
        <Field label="Status"><select value={filters.status} onChange={event => onChange({ status: event.target.value as EventFilters['status'] })}>
            <option value="">{t('Any status')}</option>
            {EVENT_STATUSES.map(status => <option key={status} value={status}>{t(status)}</option>)}
        </select></Field>
        <Field label="Period"><select value={filters.period} onChange={event => onChange({ period: event.target.value as EventFilters['period'] })}>
            <option value="">{t('Any time')}</option>
            <option value="upcoming">{t('Upcoming and running')}</option>
            <option value="past">{t('Past')}</option>
        </select></Field>
        <Button disabled={!filtered} onClick={onReset}>{t('Reset filters')}</Button>
    </div>;
});

const EventRow = memo(({ event }: { event: Event }) => <tr>
    <td><Link className={own.name} to={`/events/${event.id}`}>{event.name}</Link></td>
    <td className={own.secondary}>{eventDates(event)}</td>
    <td className={`${own.secondary} ${own.optional}`}>{[event.venueName, event.city].filter(Boolean).join(', ') || '—'}</td>
    <td><StatusBadge status={event.status} /></td>
    <td className={own.number}>{event._count?.tickets ?? 0}</td>
    <td className={`${own.number} ${own.optional}`}>{event._count?.registrations ?? 0}</td>
</tr>);

const EventsTable = memo(({ events }: { events: Event[] }) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Name')}</th><th>{t('Dates')}</th><th className={own.optional}>{t('Venue')}</th><th>{t('Status')}</th>
            <th className={own.number}>{t('Tickets')}</th><th className={`${own.number} ${own.optional}`}>{t('Registrations')}</th>
        </tr></thead>
        <tbody>{events.map(event => <EventRow key={event.id} event={event} />)}</tbody>
    </table></div>;
});

export const EventsPage = memo(() => {
    const { t } = useTranslation();
    const events = useEventsList();
    const { data } = events.list;
    return <CrmLayout title="Events">
        <EventFiltersBar filters={events.filters} filtered={events.filtered} onChange={events.change} onReset={events.reset} />
        <section className={cls.panel} aria-label={t('All events')}>
            <div className={own.summary}>
                <h2>{t('All events')}</h2>
                {data && <span className={cls.muted}>{t('Events found: {{count}}', { count: data.total })}</span>}
            </div>
            <RequestState error={events.list.error} loading={events.list.loading && !data} />
            {data && data.total > 0 && <EventsTable events={data.data} />}
            {data?.total === 0 && <p className={cls.muted}>{t(events.filtered ? 'No events match the filters' : 'No events yet')}</p>}
            {data && <Pager page={events.page} total={data.total} onChange={events.setPage} />}
        </section>
        <EventForm onSaved={() => void events.list.refresh()} />
    </CrmLayout>;
});
