import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    assignChoreographer, Event, EventRegistration, listEventRegistrations, listPeople, registerPerson, REGISTRATION_STATUSES, RegistrationFilters,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from './common';
import { listStyles as own, Pager, useDelayed } from './ListTable';
import cls from './CrmPage.module.scss';

const NO_FILTERS: RegistrationFilters = { q: '', status: '' };
const MIN_SEARCH = 2;

const personName = (person: { displayName?: string; firstName: string; lastName: string }) => person.displayName || `${person.firstName} ${person.lastName}`.trim() || '—';

// Changing a filter returns to the first page: the old page number means nothing in a new list.
const useRegistrations = (eventId: string) => {
    const [filters, setFilters] = useState(NO_FILTERS);
    const [page, setPage] = useState(1);
    const q = useDelayed(filters.q);
    const { status } = filters;
    const load = useCallback(() => listEventRegistrations(eventId, { q: q.trim(), status }, page), [eventId, q, status, page]);
    const change = (patch: Partial<RegistrationFilters>) => { setFilters(current => ({ ...current, ...patch })); setPage(1); };
    const filtered = Object.values(filters).some(Boolean);
    return { filters, page, setPage, change, filtered, reset: () => change(NO_FILTERS), list: useResource(load) };
};

interface FiltersProps { filters: RegistrationFilters; filtered: boolean; onChange: (patch: Partial<RegistrationFilters>) => void; onReset: () => void }

const RegistrationFiltersBar = memo(({ filters, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    return <div className={own.filters}>
        <div className={own.search}><Field label="Search by name, email or phone"><input type="search" value={filters.q} onChange={event => onChange({ q: event.target.value })} /></Field></div>
        <Field label="Status"><select value={filters.status} onChange={event => onChange({ status: event.target.value as RegistrationFilters['status'] })}>
            <option value="">{t('Any status')}</option>
            {REGISTRATION_STATUSES.map(status => <option key={status} value={status}>{t(status)}</option>)}
        </select></Field>
        <Button disabled={!filtered} onClick={onReset}>{t('Reset filters')}</Button>
    </div>;
});

const RegistrationRow = memo(({ registration }: { registration: EventRegistration }) => {
    const { person } = registration;
    const name = personName(person);
    return <tr>
        <td><Link className={own.name} to={`/people/${person.id}`}>{name}</Link></td>
        <td className={own.secondary}>{person.email && person.email !== name ? person.email : '—'}</td>
        <td className={`${own.secondary} ${own.optional}`}>{person.phone || '—'}</td>
        <td className={`${own.secondary} ${own.optional}`}>{person.country || '—'}</td>
        <td className={own.secondary}>{registration.ticket?.ticketType || '—'}</td>
        <td><StatusBadge status={registration.status} /></td>
    </tr>;
});

const RegistrationsTable = memo(({ registrations }: { registrations: EventRegistration[] }) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Full name')}</th><th>{t('Email')}</th><th className={own.optional}>{t('Phone')}</th><th className={own.optional}>{t('Country')}</th>
            <th>{t('Ticket')}</th><th>{t('Status')}</th>
        </tr></thead>
        <tbody>{registrations.map(registration => <RegistrationRow key={registration.id} registration={registration} />)}</tbody>
    </table></div>;
});

// `version` changes when a person is added, so the list is read again.
const Registrations = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const people = useRegistrations(eventId);
    const { data } = people.list;
    return <section id="event-registrations" className={cls.panel} aria-label={t('Registrations')}>
        <div className={own.summary}>
            <h2>{t('Registrations')}</h2>
            {data && <span className={cls.muted}>{t('People found: {{count}}', { count: data.total })}</span>}
        </div>
        <RegistrationFiltersBar filters={people.filters} filtered={people.filtered} onChange={people.change} onReset={people.reset} />
        <RequestState error={people.list.error} loading={people.list.loading && !data} />
        {data && data.total > 0 && <RegistrationsTable registrations={data.data} />}
        {data?.total === 0 && <p className={cls.muted}>{t(people.filtered ? 'No registrations match the filters' : 'No registrations yet')}</p>}
        {data && <Pager page={people.page} total={data.total} onChange={people.setPage} />}
    </section>;
});

const Choreographers = memo(({ event }: { event: Event }) => {
    const { t } = useTranslation();
    const assigned = event.choreographers ?? [];
    return <section id="event-choreographers" className={cls.panel} aria-label={t('Choreographers')}>
        <h2>{t('Choreographers')}</h2>
        {assigned.length === 0 && <p className={cls.muted}>{t('No choreographers assigned yet')}</p>}
        {assigned.length > 0 && <div className={own.tableScroll}><table className={own.table}>
            <thead><tr><th>{t('Full name')}</th><th>{t('Email')}</th><th>{t('Role at the event')}</th><th>{t('Status')}</th></tr></thead>
            <tbody>{assigned.map(item => <tr key={item.id}>
                <td><Link className={own.name} to={`/people/choreographers/${item.person.id}/events`}>{personName(item.person)}</Link></td>
                <td className={own.secondary}>{item.person.email || '—'}</td>
                <td className={own.secondary}>{item.roleTitle}</td>
                <td><StatusBadge status={item.status} /></td>
            </tr>)}</tbody>
        </table></div>}
    </section>;
});

// A contact is found by typing: the CRM holds more people than a single list can offer.
const AddPerson = memo(({ eventId, onSaved }: { eventId: string; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [personId, setPersonId] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const q = useDelayed(search);
    const load = useCallback(() => (q.trim().length >= MIN_SEARCH ? listPeople(q.trim()) : Promise.resolve({ data: [], total: 0 })), [q]);
    const found = useResource(load);
    const add = async (kind: 'registration' | 'choreographer') => {
        setSaving(true); setError('');
        try { await (kind === 'registration' ? registerPerson(eventId, personId) : assignChoreographer(eventId, personId)); setPersonId(''); setSearch(''); onSaved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setSaving(false); }
    };
    return <section id="event-add-person" className={cls.panel} aria-label={t('Add a person to the event')}>
        <h2>{t('Add a person to the event')}</h2>
        <p className={cls.muted}>{t('Type at least two letters of the name or email to find a contact.')}</p>
        <div className={own.filters}>
            <div className={own.search}><Field label="Find contact"><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPersonId(''); }} /></Field></div>
            <Field label="Contact"><select value={personId} onChange={event => setPersonId(event.target.value)}>
                <option value="">{t('Select person')}</option>
                {found.data?.data.map(person => <option key={person.id} value={person.id}>{`${personName(person)} · ${person.email ?? '—'}`}</option>)}
            </select></Field>
            <Button disabled={!personId || saving} onClick={() => void add('registration')}>{t('Register participant')}</Button>
            <Button disabled={!personId || saving} onClick={() => void add('choreographer')}>{t('Assign choreographer')}</Button>
        </div>
        <RequestState error={error || found.error} loading={false} />
    </section>;
});

// Everyone connected to the event: the registered people, the choreographers, and a way to add one.
export const EventPeople = memo(({ event, onSaved }: { event: Event; onSaved: () => void }) => {
    const [version, setVersion] = useState(0);
    const saved = useCallback(() => { setVersion(current => current + 1); onSaved(); }, [onSaved]);
    return <>
        <Registrations key={version} eventId={event.id} />
        <Choreographers event={event} />
        <AddPerson eventId={event.id} onSaved={saved} />
    </>;
});
