import { FormEvent, memo, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChoreographerDetail, ChoreographerProfileInput, getChoreographer, RELATIONSHIP_STATUSES, RelationshipStatus, updateChoreographer } from '@/entities/Choreographer';
import { Can, useCan } from '@/entities/User';
import { formText } from '@/shared/lib/form/formText';
import { formatLongDate } from '@/shared/lib/format/date';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout } from '@/widgets/Page';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
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
import cls from '@/shared/ui/layout/layout.module.scss';
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

const ProfileTabs = memo(({ personId, active, can }: { personId: string; active: TabId; can: Can }) => {
    const { t } = useTranslation();
    return <nav className={own.tabs} aria-label={t('Profile sections')}>
        {TABS.filter((tab) => can(tab.permission)).map((tab) => <Link key={tab.id} to={`/people/choreographers/${personId}/${tab.id}`} aria-current={tab.id === active ? 'page' : undefined}
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
        <Panel aria-label={t('Contact')}><h2>{t('Contact')}</h2>
            <dl className={own.definition}>
                <dt>{t('Email')}</dt><dd>{person.email ?? '—'}</dd>
                <dt>{t('Phone')}</dt><dd>{person.phone ?? '—'}</dd>
                <dt>{t('Languages')}</dt><dd>{profile.languages.join(', ') || '—'}</dd>
            </dl>
            <Link to={`/people/${person.id}`}>{t('Open contact card')}</Link>
        </Panel>
        <Panel aria-label={t('Events')}><h2>{t('Events')}</h2>
            {assignments.map((assignment) => <div className={cls.row} key={assignment.id}>
                <Link to={`/events/${assignment.event.id}`}>{assignment.event.name}</Link>
                <span className={own.secondary}>{`${formatLongDate(assignment.event.startAt)} · ${assignment.roleTitle}`}</span>
                <StatusBadge status={assignment.status} />
            </div>)}
            {!assignments.length && <p className={cls.muted}>{t('Not assigned to any event yet.')}</p>}
        </Panel>
        <Panel><h2>{t('Profile checklist')}</h2><Checklist items={detail.checklist} /></Panel>
    </>;
});

const toList = (value: FormDataEntryValue | null) => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

const readProfileForm = (form: FormData): ChoreographerProfileInput => ({
    stageName: formText(form, 'stageName'), relationshipStatus: formText(form, 'relationshipStatus') as RelationshipStatus,
    countryCode: formText(form, 'countryCode'), city: formText(form, 'city'), timezone: formText(form, 'timezone'),
    styles: toList(form.get('styles')), languages: toList(form.get('languages')),
    bioShort: formText(form, 'bioShort'), bioFull: formText(form, 'bioFull'),
    instagramUrl: formText(form, 'instagramUrl'), tiktokUrl: formText(form, 'tiktokUrl'), youtubeUrl: formText(form, 'youtubeUrl'), websiteUrl: formText(form, 'websiteUrl'),
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
    return <Panel as="form" onSubmit={submit} aria-label={t('Biography')}><h2>{t('Biography')}</h2>
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
    </Panel>;
});

const ExternalLink = memo(({ url }: { url: string | null }) => (url ? <a href={url} target="_blank" rel="noreferrer noopener">{url}</a> : <>—</>));

const BiographyView = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { profile } = detail;
    return <Panel aria-label={t('Biography')}><h2>{t('Biography')}</h2>
        <p className={own.bio}>{profile.bioFull || profile.bioShort || t('No biography yet.')}</p>
        <dl className={own.definition}>
            <dt>{t('Time zone')}</dt><dd>{profile.timezone ?? '—'}</dd>
            <dt>{t('Instagram')}</dt><dd><ExternalLink url={profile.instagramUrl} /></dd>
            <dt>{t('TikTok')}</dt><dd><ExternalLink url={profile.tiktokUrl} /></dd>
            <dt>{t('YouTube')}</dt><dd><ExternalLink url={profile.youtubeUrl} /></dd>
            <dt>{t('Website')}</dt><dd><ExternalLink url={profile.websiteUrl} /></dd>
        </dl>
    </Panel>;
});

export const ChoreographerPage = memo(() => {
    const { id = '', tab } = useParams<{ id: string; tab?: string }>();
    const can = useCan();
    const load = useCallback(() => getChoreographer(id), [id]);
    const detail = useResource(load);
    const active: TabId = TABS.some((item) => item.id === tab && can(item.permission)) ? tab as TabId : 'overview';
    const canEdit = can('choreographers.update');
    return <CrmLayout title="Choreographer">
        <RequestState error={detail.error} loading={detail.loading && !detail.data} />
        {detail.data && <>
            <ProfileHeader detail={detail.data} />
            <ProfileTabs personId={id} active={active} can={can} />
            {active === 'overview' && <OverviewTab detail={detail.data} />}
            {active === 'biography' && <>
                {canEdit
                    ? <BiographyForm key={detail.data.profile.updatedAt} detail={detail.data} onSaved={() => void detail.refresh()} />
                    : <BiographyView detail={detail.data} />}
                <BioVersions personId={id} canEdit={canEdit} />
            </>}
            {active === 'events' && <EventsTab personId={id} canManage={can('choreographers.events.manage')} />}
            {active === 'finance' && <FinanceTab personId={id} rights={{ canWrite: can('choreographers.finance.write'), canConfirm: can('choreographers.payments.confirm') }} />}
            {active === 'documents' && <DocumentsTab personId={id} canManage={can('documents.write')} />}
            {active === 'emails' && <EmailsTab personId={id} canLink={can('choreographers.conversations.link')} />}
            {active === 'activity' && <ActivityTab personId={id} />}
            {active === 'notes' && <NotesTab personId={id} canManageNotes={can('choreographers.notes.manage')}
                canReadTasks={can('tasks.read')} canManageTasks={can('tasks.write')} />}
            {active === 'media' && <MediaTab personId={id} canManage={can('choreographers.media.manage')} onChanged={() => void detail.refresh()} />}
            {active === 'contacts' && <ContactsTab personId={id} canManage={can('choreographers.contacts.manage')} />}
        </>}
    </CrmLayout>;
});
