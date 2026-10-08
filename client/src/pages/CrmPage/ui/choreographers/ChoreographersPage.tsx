import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CHOREOGRAPHER_PAGE_SIZE, ChoreographerListItem, createChoreographer, listChoreographers, listPeople, RELATIONSHIP_STATUSES, RelationshipStatus,
} from '@/entities/crm';
import { getUserAuthData } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

export const choreographerName = (item: { person: { displayName: string }; profile: { stageName: string | null } | null }) =>
    item.profile?.stageName || item.person.displayName;

const SummaryChips = memo(({ item }: { item: ChoreographerListItem }) => {
    const { t } = useTranslation();
    const { summary } = item;
    return <span className={own.chips}>
        <span className={own.chip}>{`${t('Events')}: ${summary.totalAssignments}`}</span>
        {summary.lastEventYear && <span className={own.chip}>{`${t('Last event')}: ${summary.lastEventYear}`}</span>}
        {summary.upcomingEvent && <span className={own.chip}>{`${t('Upcoming')}: ${summary.upcomingEvent.name}`}</span>}
    </span>;
});

const ChoreographerRow = memo(({ item }: { item: ChoreographerListItem }) => <div className={own.listRow}>
    <span><Link to={`/people/choreographers/${item.person.id}`}>{choreographerName(item)}</Link>
        {item.profile?.stageName && <div className={own.secondary}>{item.person.displayName}</div>}</span>
    <span className={own.secondary}>{[item.person.email, item.profile?.styles.join(', ')].filter(Boolean).join(' · ')}</span>
    <span className={own.chips}>{item.profile && <StatusBadge status={item.profile.relationshipStatus} />}<SummaryChips item={item} /></span>
</div>);

// A choreographer is always an existing person: the profile is added to them, never a copy.
const AddChoreographer = memo(() => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [personId, setPersonId] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(() => (search.trim().length >= 2 ? listPeople(search.trim()) : Promise.resolve({ data: [], total: 0 })), [search]);
    const people = useResource(load);
    const add = async () => {
        setBusy(true); setError('');
        try { await createChoreographer(personId); navigate(`/people/choreographers/${personId}/biography`); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <section className={cls.panel} aria-label={t('Add choreographer')}>
        <h2>{t('Add choreographer')}</h2>
        <p className={cls.muted}>{t('Pick an existing contact. Create the contact under People first if it does not exist yet.')}</p>
        <div className={own.filters}>
            <Field label="Find contact"><input value={search} onChange={(event) => { setSearch(event.target.value); setPersonId(''); }} /></Field>
            <Field label="Contact"><select value={personId} onChange={(event) => setPersonId(event.target.value)}>
                <option value="">{t('Select person')}</option>
                {people.data?.data.map((person) => <option key={person.id} value={person.id}>{`${person.displayName || `${person.firstName} ${person.lastName}`} · ${person.email ?? '—'}`}</option>)}
            </select></Field>
        </div>
        <div className={cls.actions}><Button disabled={busy || !personId} onClick={() => void add()}>{t('Create choreographer profile')}</Button></div>
        <RequestState error={error} loading={false} />
    </section>;
});

const Pager = memo(({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) => {
    const { t } = useTranslation();
    const pages = Math.max(1, Math.ceil(total / CHOREOGRAPHER_PAGE_SIZE));
    if (pages === 1) return null;
    return <div className={cls.actions}>
        <Button disabled={page <= 1} aria-label={t('Previous page')} onClick={() => onChange(page - 1)}>←</Button>
        <span className={cls.muted}>{`${page} / ${pages}`}</span>
        <Button disabled={page >= pages} aria-label={t('Next page')} onClick={() => onChange(page + 1)}>→</Button>
    </div>;
});

export const ChoreographersPage = memo(() => {
    const { t } = useTranslation();
    const permissions = useSelector(getUserAuthData)?.permissions ?? [];
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<RelationshipStatus | ''>('');
    const [page, setPage] = useState(1);
    const load = useCallback(() => listChoreographers({ q, relationshipStatus: status }, page), [q, status, page]);
    const list = useResource(load);
    return <CrmLayout title="Choreographers">
        <div className={own.filters}>
            <Field label="Search choreographers"><input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} /></Field>
            <Field label="Relationship"><select value={status} onChange={(event) => { setStatus(event.target.value as RelationshipStatus | ''); setPage(1); }}>
                <option value="">{t('Any status')}</option>
                {RELATIONSHIP_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select></Field>
        </div>
        <RequestState error={list.error} loading={list.loading} />
        <section className={cls.panel} aria-label={t('Choreographers')}>
            {list.data?.data.map((item) => <ChoreographerRow key={item.person.id} item={item} />)}
            {list.data?.total === 0 && <p className={cls.muted}>{t('No choreographers found')}</p>}
            {list.data && <Pager page={page} total={list.data.total} onChange={setPage} />}
        </section>
        {permissions.includes('choreographers.create') && <AddChoreographer />}
    </CrmLayout>;
});
