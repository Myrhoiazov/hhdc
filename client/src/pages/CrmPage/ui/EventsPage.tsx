import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Event, getEvent, listTicketTypes } from '@/entities/crm';
import { getUserAuthData } from '@/entities/User';
import { formatDateTime } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from './common';
import { RequestState } from '@/shared/ui/RequestState';
import { useNumbers } from '@/shared/lib/format/useNumbers';
import { EventDocuments } from './choreographers/EventDocuments';
import { EventExpenses } from './EventExpenses';
import { EventPeople } from './EventPeople';
import { EventSalesPanel } from './EventSalesPanel';
import { EventSectionNav } from './EventSectionNav';
import { EventTeam } from './EventTeam';
import cls from './CrmPage.module.scss';

// What the event sells, as read from the ticketing provider; prices are not edited in the CRM.
const EventTicketTypes = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listTicketTypes(eventId), [eventId]);
    const types = useResource(load);
    const { money } = useNumbers(types.data?.[0]?.currency);
    return <section id="event-ticket-types" className={cls.panel} aria-label={t('Ticket types')}><h2>{t('Ticket types')}</h2>
        <RequestState error={types.error} loading={types.loading} />
        {types.data?.map(type => <div className={cls.row} key={type.id}><span>{type.name}</span><span>{money(type.price)}</span><span>{t('Sold: {{count}}', { count: type.soldCount })}</span><span className={cls.muted}>{t(`Ticket status: ${type.status}`, { defaultValue: type.status })}</span></div>)}
        {types.data?.length === 0 && <p className={cls.muted}>{t('No ticket types yet')}</p>}
    </section>;
});

const EventDates = memo(({ event }: { event: Event }) => (
    <section className={cls.panel}>
        <p>{formatDateTime(event.startAt)} — {formatDateTime(event.endAt)}</p>
        <p>{event.timezone} · {event.venueName}</p>
    </section>
));

// Sales and expenses are money: both are shown only to staff who may see finance.
interface EventMoneyProps { eventId: string; permissions: string[]; version: number; onChanged: () => void }

const EventMoney = memo(({ eventId, permissions, version, onChanged }: EventMoneyProps) => {
    if (!permissions.includes('finance.read')) return null;
    return <><EventSalesPanel eventId={eventId} /><EventExpenses eventId={eventId} canEdit={permissions.includes('events.write')} version={version} onChanged={onChanged} /></>;
});

// The pay of the team is kept among the expenses, so a change in one block is read by the other.
const useCounter = (): [number, () => void] => {
    const [count, setCount] = useState(0);
    return [count, useCallback(() => setCount(current => current + 1), [])];
};

export const EventPage = memo(() => {
    const { id = '' } = useParams();
    const load = useCallback(() => getEvent(id), [id]);
    const event = useResource(load);
    const permissions = useSelector(getUserAuthData)?.permissions ?? [];
    const [teamVersion, teamChanged] = useCounter();
    const [expensesVersion, expensesChanged] = useCounter();
    return <CrmLayout title={event.data?.name || 'Event'}><RequestState error={event.error} loading={event.loading} />
        {event.data && <>
            <EventSectionNav />
            <EventDates event={event.data} />
            <EventMoney eventId={id} permissions={permissions} version={teamVersion} onChanged={expensesChanged} />
            <EventTicketTypes eventId={id} />
            <EventPeople event={event.data} onSaved={() => void event.refresh()} />
            <EventTeam eventId={id} canEdit={permissions.includes('events.write')} seesMoney={permissions.includes('finance.read')}
                version={expensesVersion} onChanged={teamChanged} />
            <EventDocuments eventId={id} />
        </>}
    </CrmLayout>;
});
