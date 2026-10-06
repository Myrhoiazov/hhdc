import { FormEvent, memo, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addPersonRole, getPerson, getPersonActivity, listPeople, Person, PersonRole, savePerson } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

const roles: PersonRole[] = ['CUSTOMER', 'PARTICIPANT', 'CHOREOGRAPHER', 'STAFF'];
const personName = (person: Person) => person.displayName || `${person.firstName} ${person.lastName}`;

const PersonForm = memo(({ person, onSaved }: { person?: Person; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setSaving(true);
        try {
            const saved = await savePerson({ firstName: String(values.get('firstName')), lastName: String(values.get('lastName')), email: String(values.get('email')) || null, phone: String(values.get('phone')) || null, notes: String(values.get('notes')) }, person?.id);
            if (!person) await Promise.all(values.getAll('roles').map(role => addPersonRole(saved.id, role as PersonRole)));
            onSaved();
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setSaving(false); }
    };
    return <form className={cls.panel} onSubmit={submit}><h2>{t(person ? 'Edit contact' : 'Create person')}</h2>
        <div className={cls.grid}>
            <Field label="First name"><input name="firstName" defaultValue={person?.firstName} required /></Field>
            <Field label="Last name"><input name="lastName" defaultValue={person?.lastName} required /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={person?.email || ''} /></Field>
            <Field label="Phone"><input name="phone" type="tel" defaultValue={person?.phone || ''} /></Field>
        </div>
        <Field label="Notes"><textarea name="notes" defaultValue={person?.notes || ''} /></Field>
        {!person && <div className={cls.roles}>{roles.map(role => <label key={role}><input name="roles" type="checkbox" value={role} /> {t(role)}</label>)}</div>}
        <RequestState error={error} loading={false} /><Button type="submit" disabled={saving}>{t('Save')}</Button>
    </form>;
});

export const PeoplePage = memo(() => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const load = useCallback(() => listPeople(search), [search]);
    const resource = useResource(load);
    return <CrmLayout title="People"><Field label="Search contacts"><input value={search} onChange={event => setSearch(event.target.value)} /></Field>
        <RequestState error={resource.error} loading={resource.loading} />
        <section className={cls.panel}><h2>{t('All contacts')}</h2>{resource.data?.data.map(person => <div className={cls.row} key={person.id}><Link to={`/people/${person.id}`}>{personName(person)}</Link><span>{person.email}</span><span>{person.roles.map(item => t(item.role)).join(', ')}</span></div>)}
            {resource.data?.total === 0 && <p>{t('No contacts yet')}</p>}
        </section><PersonForm onSaved={() => void resource.refresh()} />
    </CrmLayout>;
});

const PersonRoles = memo(({ person, onSaved }: { person: Person; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const add = async (role: PersonRole) => {
        try { await addPersonRole(person.id, role); onSaved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
    };
    return <section className={cls.panel}><h2>{t('Roles')}</h2><div className={cls.roles}>{roles.map(role => <Button key={role} disabled={person.roles.some(item => item.role === role)} onClick={() => void add(role)}>{t(role)}</Button>)}</div><RequestState error={error} loading={false} /></section>;
});

export const PersonPage = memo(() => {
    const { id = '' } = useParams();
    const { t } = useTranslation();
    const load = useCallback(() => getPerson(id), [id]);
    const loadActivity = useCallback(() => getPersonActivity(id), [id]);
    const person = useResource(load);
    const activity = useResource(loadActivity);
    const refresh = () => { void person.refresh(); void activity.refresh(); };
    return <CrmLayout title={person.data ? personName(person.data) : 'Person'}><RequestState error={person.error} loading={person.loading} />
        {person.data && <><PersonForm key={person.data.id} person={person.data} onSaved={refresh} /><PersonRoles person={person.data} onSaved={refresh} /></>}
        <section className={cls.panel}><h2>{t('Activity timeline')}</h2><RequestState error={activity.error} loading={activity.loading} />{activity.data?.data.map(item => <div className={cls.row} key={item.id}><span>{t(item.type)}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</section>
    </CrmLayout>;
});
