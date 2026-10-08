import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ASSIGNMENT_STATUSES, AssignmentStatus, AssignmentUpdate, assignChoreographerToEvent, ChoreographerHistoryItem, listChoreographerHistory, listEvents,
    LOGISTICS_STATUSES, LogisticsStatus, updateChoreographerAssignment,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// Newest year first; the items inside a year keep the order the server gave them.
export const groupByYear = (items: ChoreographerHistoryItem[]): [number, ChoreographerHistoryItem[]][] => {
    const groups = new Map<number, ChoreographerHistoryItem[]>();
    items.forEach((item) => groups.set(item.year, [...(groups.get(item.year) ?? []), item]));
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
};

const StatusSelect = memo(({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) => {
    const { t } = useTranslation();
    return <label className={own.inlineSelect}>{t(label)}
        <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select>
    </label>;
});

const AssignmentCard = memo(({ item, canManage, onUpdate }: { item: ChoreographerHistoryItem; canManage: boolean; onUpdate: (id: string, input: AssignmentUpdate) => void }) => {
    const { t } = useTranslation();
    return <article className={own.assignment} aria-label={item.event.name}>
        <div className={own.headerTop}>
            <div><Link to={`/events/${item.event.id}`}>{item.event.name}</Link>
                <div className={own.secondary}>{[`${formatDate(item.event.startAt)} – ${formatDate(item.event.endAt)}`, item.event.city, item.roleTitle].filter(Boolean).join(' · ')}</div></div>
            <span className={own.chips}><span className={own.chip}>{t(`TIMING_${item.timing}`)}</span><StatusBadge status={item.status} /></span>
        </div>
        {item.sessions.length > 0 && <div className={own.secondary}>{`${t('Sessions')}: ${item.sessions.map((session) => session.name).join(', ')}`}</div>}
        {item.notes && <p className={own.bio}>{item.notes}</p>}
        {canManage
            ? <div className={own.controls}>
                <StatusSelect label="Participation" value={item.status} options={ASSIGNMENT_STATUSES} onChange={(status) => onUpdate(item.id, { status: status as AssignmentStatus })} />
                <StatusSelect label="Travel" value={item.travelStatus} options={LOGISTICS_STATUSES} onChange={(travelStatus) => onUpdate(item.id, { travelStatus: travelStatus as LogisticsStatus })} />
                <StatusSelect label="Hotel" value={item.hotelStatus} options={LOGISTICS_STATUSES} onChange={(hotelStatus) => onUpdate(item.id, { hotelStatus: hotelStatus as LogisticsStatus })} />
            </div>
            : <div className={own.secondary}>{`${t('Travel')}: ${t(item.travelStatus)} · ${t('Hotel')}: ${t(item.hotelStatus)}`}</div>}
    </article>;
});

const AddToEvent = memo(({ personId, assignedEventIds, onSaved }: { personId: string; assignedEventIds: string[]; onSaved: () => void }) => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const available = (events.data?.data ?? []).filter((event) => !assignedEventIds.includes(event.id));
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy(true); setError('');
        try {
            await assignChoreographerToEvent(personId, { eventId: String(form.get('eventId')), roleTitle: String(form.get('roleTitle') ?? '').trim() || undefined, status: String(form.get('status')) as AssignmentStatus });
            formElement.reset(); onSaved();
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setBusy(false); }
    };
    return <form className={cls.panel} onSubmit={submit} aria-label={t('Add to event')}><h2>{t('Add to event')}</h2>
        <p className={cls.muted}>{t('Past editions can be linked too. If the event is not in the list, create it under Events first.')}</p>
        <div className={cls.grid}>
            <Field label="Event"><select name="eventId" required defaultValue="">
                <option value="" disabled>{t('Select event')}</option>
                {available.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select></Field>
            <Field label="Role at the event"><input name="roleTitle" maxLength={120} placeholder="Choreographer" /></Field>
            <Field label="Participation"><select name="status" defaultValue="INVITED">{ASSIGNMENT_STATUSES.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></Field>
        </div>
        <RequestState error={error || events.error} loading={false} />
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Add to event')}</Button></div>
    </form>;
});

export const EventsTab = memo(({ personId, canManage }: { personId: string; canManage: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listChoreographerHistory(personId), [personId]);
    const history = useResource(load);
    const [error, setError] = useState('');
    const update = (assignmentId: string, input: AssignmentUpdate) => {
        setError('');
        updateChoreographerAssignment(personId, assignmentId, input).then(() => history.refresh())
            .catch((cause) => setError(cause instanceof Error ? cause.message : t('Request failed')));
    };
    const items = history.data ?? [];
    return <>
        <RequestState error={error || history.error} loading={history.loading && !history.data} />
        {groupByYear(items).map(([year, group]) => <section className={cls.panel} key={year} aria-label={String(year)}>
            <h2>{year}</h2>
            {group.map((item) => <AssignmentCard key={item.id} item={item} canManage={canManage} onUpdate={update} />)}
        </section>)}
        {history.data?.length === 0 && <section className={cls.panel}><p className={cls.muted}>{t('Not assigned to any event yet.')}</p></section>}
        {canManage && <AddToEvent personId={personId} assignedEventIds={items.map((item) => item.event.id)} onSaved={() => void history.refresh()} />}
    </>;
});
