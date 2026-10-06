import { FormEvent, memo, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { assignChoreographer, createEvent, Event, getEvent, listEvents, listPeople, registerPerson } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

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

export const EventsPage = memo(() => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    return <CrmLayout title="Events"><RequestState error={events.error} loading={events.loading} /><section className={cls.panel}><h2>{t('All events')}</h2>
        {events.data?.data.map(event => <div className={cls.row} key={event.id}><Link to={`/events/${event.id}`}>{event.name}</Link><span>{t(event.status)}</span><time>{new Date(event.startAt).toLocaleDateString()}</time></div>)}
        {events.data?.total === 0 && <p>{t('No events yet')}</p>}
    </section><EventForm onSaved={() => void events.refresh()} /></CrmLayout>;
});

const EventAssignments = memo(({ event, onSaved }: { event: Event; onSaved: () => void }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listPeople(), []);
    const people = useResource(load);
    const [personId, setPersonId] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const assign = async (kind: 'registration' | 'choreographer') => {
        setSaving(true);
        try { await (kind === 'registration' ? registerPerson(event.id, personId) : assignChoreographer(event.id, personId)); onSaved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setSaving(false); }
    };
    return <section className={cls.panel}><h2>{t('Event people')}</h2><Field label="Person"><select value={personId} onChange={change => setPersonId(change.target.value)}><option value="">{t('Select person')}</option>{people.data?.data.map(person => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></Field>
        <div className={cls.roles}><Button disabled={!personId || saving} onClick={() => void assign('registration')}>{t('Register participant')}</Button><Button disabled={!personId || saving} onClick={() => void assign('choreographer')}>{t('Assign choreographer')}</Button></div>
        <RequestState error={error || people.error} loading={people.loading} />
        <h3>{t('Registrations')}</h3>{event.registrations?.map(item => <div key={item.id} className={cls.row}><Link to={`/people/${item.person.id}`}>{item.person.firstName} {item.person.lastName}</Link><span>{t(item.status)}</span></div>)}
        <h3>{t('Choreographers')}</h3>{event.choreographers?.map(item => <div key={item.id} className={cls.row}><Link to={`/people/${item.person.id}`}>{item.person.firstName} {item.person.lastName}</Link><span>{item.roleTitle}</span><span>{t(item.status)}</span></div>)}
    </section>;
});

export const EventPage = memo(() => {
    const { id = '' } = useParams();
    const load = useCallback(() => getEvent(id), [id]);
    const event = useResource(load);
    return <CrmLayout title={event.data?.name || 'Event'}><RequestState error={event.error} loading={event.loading} />
        {event.data && <><section className={cls.panel}><p>{new Date(event.data.startAt).toLocaleString()} — {new Date(event.data.endAt).toLocaleString()}</p><p>{event.data.timezone} · {event.data.venueName}</p></section><EventAssignments event={event.data} onSaved={() => void event.refresh()} /></>}
    </CrmLayout>;
});
