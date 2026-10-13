import { FormEvent, memo, ReactNode, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, addPersonRole, getPerson, getPersonActivity, Person, PERSON_ROLES, PersonRole, removePersonRole, savePerson } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { getUserAuthData } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { peopleListPath } from '../model/peopleListUrl';
import { CrmLayout, Field, RequestState } from './common';
import { PersonConversations } from './PersonConversations';
import { PersonExpenses } from './PersonExpenses';
import { PersonOrders } from './PersonOrders';
import { PersonRemovalPanel } from './PersonRemoval';
import cls from './CrmPage.module.scss';
import own from './PersonPage.module.scss';

const personName = (person: Person) => person.displayName || `${person.firstName} ${person.lastName}`;

// Editing only: a new person is created from the header (features/createPerson).
const PersonForm = memo(({ person, onSaved }: { person: Person; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setSaving(true);
        setError('');
        try {
            await savePerson({ firstName: String(values.get('firstName')), lastName: String(values.get('lastName')), email: String(values.get('email')) || null, phone: String(values.get('phone')) || null, notes: String(values.get('notes')) }, person.id);
            setSaved(true);
            onSaved();
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setSaving(false); }
    };
    // "Saved" is true only until the next keystroke: after it the form differs from what is stored.
    return <form className={cls.panel} onSubmit={submit} onChange={() => setSaved(false)}><h2>{t('Edit contact')}</h2>
        <div className={cls.grid}>
            <Field label="First name"><input name="firstName" defaultValue={person.firstName} required /></Field>
            <Field label="Last name"><input name="lastName" defaultValue={person.lastName} required /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={person.email || ''} /></Field>
            <Field label="Phone"><input name="phone" type="tel" defaultValue={person.phone || ''} /></Field>
        </div>
        <Field label="Notes"><textarea name="notes" rows={4} defaultValue={person.notes || ''} /></Field>
        <RequestState error={error} loading={false} />
        <div className={own.formActions}>
            {saved && <span role="status" className={cls.muted}>{t('Saved')}</span>}
            <Button type="submit" theme={ButtonTheme.BACKGROUND_INVERTED} disabled={saving}>{t('Save')}</Button>
        </div>
    </form>;
});

interface PersonProps { person: Person; onSaved: () => void }

// A role the contact has is a badge with a cross that takes it away: a role given by mistake is
// undone where it was given. A role it lacks is a dashed button that gives it.
const RoleBadge = memo(({ role, onRemove }: { role: PersonRole; onRemove: (role: PersonRole) => void }) => {
    const { t } = useTranslation();
    return <span className={classNames(cls.badge, {}, [own.role])}>
        {t(role)}
        <button type="button" className={own.removeRole} aria-label={t('Remove the role {{role}}', { role: t(role) })} onClick={() => onRemove(role)}>×</button>
    </span>;
});

const PersonRoles = memo(({ person, onSaved }: PersonProps) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const has = (role: PersonRole) => person.roles.some(item => item.role === role);
    const change = async (request: Promise<unknown>) => {
        setError('');
        try { await request; onSaved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
    };
    return <div className={own.roles}>
        <h2 className={own.label}>{t('Roles')}</h2>
        {PERSON_ROLES.filter(has).map(role => <RoleBadge key={role} role={role} onRemove={removed => void change(removePersonRole(person.id, removed))} />)}
        {PERSON_ROLES.filter(role => !has(role)).map(role => <Button key={role} className={own.addRole} aria-label={t('Add the role {{role}}', { role: t(role) })} onClick={() => void change(addPersonRole(person.id, role))}>{`+ ${t(role)}`}</Button>)}
        <RequestState error={error} loading={false} />
    </div>;
});

const Fact = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <div className={own.fact}><dt className={own.label}>{t(label)}</dt><dd>{children}</dd></div>;
});

const contactLink = (scheme: 'mailto' | 'tel', value?: string | null) => (value ? <a href={`${scheme}:${value}`}>{value}</a> : '—');

// Who the contact is, read at a glance: the form below is for changing it, not for reading it.
const PersonSummary = memo(({ person, onSaved }: PersonProps) => {
    const { t } = useTranslation();
    return <section className={cls.panel} aria-label={t('Contact summary')}>
        <dl className={own.facts}>
            <Fact label="Email">{contactLink('mailto', person.email)}</Fact>
            <Fact label="Phone">{contactLink('tel', person.phone)}</Fact>
            <Fact label="Country">{person.country || '—'}</Fact>
            <Fact label="Source">{person.source ? t(`Person source: ${person.source}`, { defaultValue: person.source }) : '—'}</Fact>
            <Fact label="Added">{person.createdAt ? new Date(person.createdAt).toLocaleDateString() : '—'}</Fact>
        </dl>
        <PersonRoles person={person} onSaved={onSaved} />
    </section>;
});

const PersonActivity = memo(({ activity }: { activity: Activity[] | undefined }) => {
    const { t } = useTranslation();
    return <>
        {activity?.map(item => <div className={cls.row} key={item.id}><span className={own.activityType}>{t(item.type)}</span><time className={own.activityTime}>{new Date(item.createdAt).toLocaleString()}</time></div>)}
        {activity?.length === 0 && <p className={cls.muted}>{t('No activity yet')}</p>}
    </>;
});

interface PersonBodyProps extends PersonProps { permissions: string[]; activity: ReactNode; onDeleted: () => void }

// What happened with the contact takes the wide column; what can be changed about it stands beside.
const PersonBody = memo(({ person, permissions, activity, onSaved, onDeleted }: PersonBodyProps) => <>
    <PersonSummary person={person} onSaved={onSaved} />
    <div className={own.columns}>
        <div className={own.main}>
            <PersonOrders personId={person.id} />
            <PersonConversations person={person} />
            {permissions.includes('finance.read') && <PersonExpenses personId={person.id} />}
            {activity}
        </div>
        <aside className={own.side}>
            <PersonForm key={person.id} person={person} onSaved={onSaved} />
            {permissions.includes('people.write') && <PersonRemovalPanel person={person} onDeleted={onDeleted} />}
        </aside>
    </div>
</>);

export const PersonPage = memo(() => {
    const { id = '' } = useParams();
    const { t } = useTranslation();
    const load = useCallback(() => getPerson(id), [id]);
    const loadActivity = useCallback(() => getPersonActivity(id), [id]);
    const person = useResource(load);
    const activity = useResource(loadActivity);
    const navigate = useNavigate();
    const listPath = peopleListPath(useLocation().state);
    const permissions = useSelector(getUserAuthData)?.permissions ?? [];
    const refresh = () => { void person.refresh(); void activity.refresh(); };
    const timeline = <section className={cls.panel} aria-label={t('Activity timeline')}><h2>{t('Activity timeline')}</h2>
        <RequestState error={activity.error} loading={activity.loading && !activity.data} />
        <PersonActivity activity={activity.data?.data} />
    </section>;
    return <CrmLayout title={person.data ? personName(person.data) : 'Person'} back={{ to: listPath, label: 'Back to contacts' }}>
        <RequestState error={person.error} loading={person.loading && !person.data} />
        {person.data && <PersonBody person={person.data} permissions={permissions} activity={timeline} onSaved={refresh} onDeleted={() => navigate(listPath)} />}
    </CrmLayout>;
});
