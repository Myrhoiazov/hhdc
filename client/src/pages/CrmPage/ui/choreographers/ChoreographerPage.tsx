import { FormEvent, memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChoreographerDetail, ChoreographerProfileInput, getChoreographer, RELATIONSHIP_STATUSES, RelationshipStatus, updateChoreographer } from '@/entities/crm';
import { getUserAuthData } from '@/entities/User';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from '../common';
import { ActivityTab } from './ActivityTab';
import { BioVersions } from './BioVersions';
import { ChoreographerAvatar } from './ChoreographerAvatar';
import { choreographerName } from './ChoreographersPage';
import { ContactsTab } from './ContactsTab';
import { DocumentsTab } from './DocumentsTab';
import { EmailsTab } from './EmailsTab';
import { EventsTab } from './EventsTab';
import { FinanceTab } from './FinanceTab';
import { MediaTab } from './MediaTab';
import { NotesTab } from './NotesTab';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

// A tab is listed only for people who may read it; the server enforces the same permission.
const TABS = [
    { id: 'overview', label: 'Overview', permission: 'choreographers.read' },
    { id: 'biography', label: 'Biography', permission: 'choreographers.read' },
    { id: 'events', label: 'Events & History', permission: 'choreographers.read' },
    { id: 'finance', label: 'Finance', permission: 'choreographers.finance.read' },
    { id: 'documents', label: 'Documents', permission: 'documents.read' },
    { id: 'emails', label: 'Emails', permission: 'choreographers.conversations.read' },
    { id: 'media', label: 'Photos', permission: 'choreographers.read' },
    { id: 'contacts', label: 'Contacts', permission: 'choreographers.contacts.read' },
    { id: 'notes', label: 'Notes and follow-ups', permission: 'choreographers.notes.read' },
    { id: 'activity', label: 'Activity', permission: 'choreographers.activity.read' },
] as const;
type TabId = typeof TABS[number]['id'];

const CHECKLIST_LABELS: Record<string, string> = {
    stage_name: 'Stage name', biography: 'Biography', styles: 'Dance styles', country: 'Country', social_link: 'Instagram or website', email: 'Email',
};

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const ProfileHeader = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { person, profile, summary } = detail;
    const location = [profile.city, profile.countryCode].filter(Boolean).join(', ');
    return <header className={own.header}>
        <div className={own.headerTop}>
            <div className={own.identity}>
                <ChoreographerAvatar personId={person.id} photoId={detail.coverPhotoId} name={choreographerName(detail)} large />
                <div><h2>{choreographerName(detail)}</h2>
                    {profile.stageName && <div className={own.secondary}>{person.displayName}</div>}
                    {location && <div className={own.secondary}>{location}</div>}</div>
            </div>
            <StatusBadge status={profile.relationshipStatus} />
        </div>
        {profile.styles.length > 0 && <div className={own.chips} aria-label={t('Dance styles')}>{profile.styles.map((style) => <span key={style} className={own.chip}>{style}</span>)}</div>}
        <div className={own.chips}>
            <span className={own.chip}>{`${t('Events')}: ${summary.totalAssignments}`}</span>
            {summary.lastEventYear && <span className={own.chip}>{`${t('Last event')}: ${summary.lastEventYear}`}</span>}
            {summary.upcomingEvent && <span className={own.chip}>{`${t('Upcoming')}: ${summary.upcomingEvent.name}`}</span>}
            <span className={own.chip}>{`${t('Open tasks')}: ${summary.openTasks ?? 0}`}</span>
        </div>
    </header>;
});

const ProfileTabs = memo(({ personId, active, permissions }: { personId: string; active: TabId; permissions: string[] }) => {
    const { t } = useTranslation();
    return <nav className={own.tabs} aria-label={t('Profile sections')}>
        {TABS.filter((tab) => permissions.includes(tab.permission)).map((tab) => <Link key={tab.id} to={`/people/choreographers/${personId}/${tab.id}`} aria-current={tab.id === active ? 'page' : undefined}
            className={classNames(own.tab, { [own.activeTab]: tab.id === active })}>{t(tab.label)}</Link>)}
    </nav>;
});

const Checklist = memo(({ items }: { items: string[] }) => {
    const { t } = useTranslation();
    if (!items.length) return <p className={cls.muted}>{t('The profile is complete.')}</p>;
    return <ul aria-label={t('Missing from the profile')}>{items.map((item) => <li key={item}>{t(CHECKLIST_LABELS[item] ?? item)}</li>)}</ul>;
});

const OverviewTab = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { person, profile, assignments } = detail;
    return <>
        <section className={cls.panel} aria-label={t('Contact')}><h2>{t('Contact')}</h2>
            <dl className={own.definition}>
                <dt>{t('Email')}</dt><dd>{person.email ?? '—'}</dd>
                <dt>{t('Phone')}</dt><dd>{person.phone ?? '—'}</dd>
                <dt>{t('Languages')}</dt><dd>{profile.languages.join(', ') || '—'}</dd>
            </dl>
            <Link to={`/people/${person.id}`}>{t('Open contact card')}</Link>
        </section>
        <section className={cls.panel} aria-label={t('Events')}><h2>{t('Events')}</h2>
            {assignments.map((assignment) => <div className={cls.row} key={assignment.id}>
                <Link to={`/events/${assignment.event.id}`}>{assignment.event.name}</Link>
                <span className={own.secondary}>{`${formatDate(assignment.event.startAt)} · ${assignment.roleTitle}`}</span>
                <StatusBadge status={assignment.status} />
            </div>)}
            {!assignments.length && <p className={cls.muted}>{t('Not assigned to any event yet.')}</p>}
        </section>
        <section className={cls.panel}><h2>{t('Profile checklist')}</h2><Checklist items={detail.checklist} /></section>
    </>;
});

const toList = (value: FormDataEntryValue | null) => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

const readProfileForm = (form: FormData): ChoreographerProfileInput => ({
    stageName: text(form, 'stageName'), relationshipStatus: text(form, 'relationshipStatus') as RelationshipStatus,
    countryCode: text(form, 'countryCode'), city: text(form, 'city'), timezone: text(form, 'timezone'),
    styles: toList(form.get('styles')), languages: toList(form.get('languages')),
    bioShort: text(form, 'bioShort'), bioFull: text(form, 'bioFull'),
    instagramUrl: text(form, 'instagramUrl'), tiktokUrl: text(form, 'tiktokUrl'), youtubeUrl: text(form, 'youtubeUrl'), websiteUrl: text(form, 'websiteUrl'),
});

const LinkFields = memo(({ detail }: { detail: ChoreographerDetail }) => <>
    <Field label="Instagram"><input name="instagramUrl" type="url" defaultValue={detail.profile.instagramUrl ?? ''} /></Field>
    <Field label="TikTok"><input name="tiktokUrl" type="url" defaultValue={detail.profile.tiktokUrl ?? ''} /></Field>
    <Field label="YouTube"><input name="youtubeUrl" type="url" defaultValue={detail.profile.youtubeUrl ?? ''} /></Field>
    <Field label="Website"><input name="websiteUrl" type="url" defaultValue={detail.profile.websiteUrl ?? ''} /></Field>
</>);

const BiographyForm = memo(({ detail, onSaved }: { detail: ChoreographerDetail; onSaved: () => void }) => {
    const { t } = useTranslation();
    const { profile } = detail;
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true); setError('');
        try { await updateChoreographer(detail.person.id, readProfileForm(new FormData(event.currentTarget))); onSaved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setBusy(false); }
    };
    return <form className={cls.panel} onSubmit={submit} aria-label={t('Biography')}><h2>{t('Biography')}</h2>
        <div className={cls.grid}>
            <Field label="Stage name"><input name="stageName" maxLength={200} defaultValue={profile.stageName ?? ''} /></Field>
            <Field label="Relationship"><select name="relationshipStatus" defaultValue={profile.relationshipStatus}>
                {RELATIONSHIP_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></Field>
            <Field label="Country code"><input name="countryCode" maxLength={2} placeholder="NL" defaultValue={profile.countryCode ?? ''} /></Field>
            <Field label="City"><input name="city" maxLength={120} defaultValue={profile.city ?? ''} /></Field>
            <Field label="Time zone"><input name="timezone" maxLength={64} placeholder="Europe/Amsterdam" defaultValue={profile.timezone ?? ''} /></Field>
            <Field label="Dance styles (comma separated)"><input name="styles" defaultValue={profile.styles.join(', ')} /></Field>
            <Field label="Languages (comma separated)"><input name="languages" defaultValue={profile.languages.join(', ')} /></Field>
            <LinkFields detail={detail} />
            <div className={cls.wide}><Field label="Short biography"><textarea name="bioShort" rows={3} maxLength={600} defaultValue={profile.bioShort ?? ''} /></Field></div>
            <div className={cls.wide}><Field label="Full biography"><textarea name="bioFull" rows={10} defaultValue={profile.bioFull ?? ''} /></Field></div>
        </div>
        <RequestState error={error} loading={false} />
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Save')}</Button></div>
    </form>;
});

const ExternalLink = memo(({ url }: { url: string | null }) => (url ? <a href={url} target="_blank" rel="noreferrer noopener">{url}</a> : <>—</>));

const BiographyView = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { profile } = detail;
    return <section className={cls.panel} aria-label={t('Biography')}><h2>{t('Biography')}</h2>
        <p className={own.bio}>{profile.bioFull || profile.bioShort || t('No biography yet.')}</p>
        <dl className={own.definition}>
            <dt>{t('Time zone')}</dt><dd>{profile.timezone ?? '—'}</dd>
            <dt>{t('Instagram')}</dt><dd><ExternalLink url={profile.instagramUrl} /></dd>
            <dt>{t('TikTok')}</dt><dd><ExternalLink url={profile.tiktokUrl} /></dd>
            <dt>{t('YouTube')}</dt><dd><ExternalLink url={profile.youtubeUrl} /></dd>
            <dt>{t('Website')}</dt><dd><ExternalLink url={profile.websiteUrl} /></dd>
        </dl>
    </section>;
});

export const ChoreographerPage = memo(() => {
    const { id = '', tab } = useParams<{ id: string; tab?: string }>();
    const permissions = useSelector(getUserAuthData)?.permissions ?? [];
    const load = useCallback(() => getChoreographer(id), [id]);
    const detail = useResource(load);
    const active: TabId = TABS.some((item) => item.id === tab && permissions.includes(item.permission)) ? tab as TabId : 'overview';
    const canEdit = permissions.includes('choreographers.update');
    return <CrmLayout title="Choreographer">
        <RequestState error={detail.error} loading={detail.loading && !detail.data} />
        {detail.data && <>
            <ProfileHeader detail={detail.data} />
            <ProfileTabs personId={id} active={active} permissions={permissions} />
            {active === 'overview' && <OverviewTab detail={detail.data} />}
            {active === 'biography' && <>
                {canEdit
                    ? <BiographyForm key={detail.data.profile.updatedAt} detail={detail.data} onSaved={() => void detail.refresh()} />
                    : <BiographyView detail={detail.data} />}
                <BioVersions personId={id} canEdit={canEdit} />
            </>}
            {active === 'events' && <EventsTab personId={id} canManage={permissions.includes('choreographers.events.manage')} />}
            {active === 'finance' && <FinanceTab personId={id} rights={{ canWrite: permissions.includes('choreographers.finance.write'), canConfirm: permissions.includes('choreographers.payments.confirm') }} />}
            {active === 'documents' && <DocumentsTab personId={id} canManage={permissions.includes('documents.write')} />}
            {active === 'emails' && <EmailsTab personId={id} canLink={permissions.includes('choreographers.conversations.link')} />}
            {active === 'activity' && <ActivityTab personId={id} />}
            {active === 'notes' && <NotesTab personId={id} canManageNotes={permissions.includes('choreographers.notes.manage')}
                canReadTasks={permissions.includes('tasks.read')} canManageTasks={permissions.includes('tasks.write')} />}
            {active === 'media' && <MediaTab personId={id} canManage={permissions.includes('choreographers.media.manage')} onChanged={() => void detail.refresh()} />}
            {active === 'contacts' && <ContactsTab personId={id} canManage={permissions.includes('choreographers.contacts.manage')} />}
        </>}
    </CrmLayout>;
});
