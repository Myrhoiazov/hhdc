import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Event, getEvent, listTicketTypes } from '@/entities/crm';
import { getUserAuthData } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout, RequestState, useNumbers } from './common';
import { EventDocuments } from './choreographers/EventDocuments';
import { EventExpenses } from './EventExpenses';
import { EventPeople } from './EventPeople';
import { EventSalesPanel } from './EventSalesPanel';
import { EventSectionNav } from './EventSectionNav';
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
        <p>{new Date(event.startAt).toLocaleString()} — {new Date(event.endAt).toLocaleString()}</p>
        <p>{event.timezone} · {event.venueName}</p>
    </section>
));

// Sales and expenses are money: both are shown only to staff who may see finance.
const EventMoney = memo(({ eventId, permissions }: { eventId: string; permissions: string[] }) => {
    if (!permissions.includes('finance.read')) return null;
    return <><EventSalesPanel eventId={eventId} /><EventExpenses eventId={eventId} canEdit={permissions.includes('events.write')} /></>;
});

export const EventPage = memo(() => {
    const { id = '' } = useParams();
    const load = useCallback(() => getEvent(id), [id]);
    const event = useResource(load);
    const permissions = useSelector(getUserAuthData)?.permissions ?? [];
    return <CrmLayout title={event.data?.name || 'Event'}><RequestState error={event.error} loading={event.loading} />
        {event.data && <>
            <EventSectionNav />
            <EventDates event={event.data} />
            <EventMoney eventId={id} permissions={permissions} />
            <EventTicketTypes eventId={id} />
            <EventPeople event={event.data} onSaved={() => void event.refresh()} />
            <EventDocuments eventId={id} />
        </>}
    </CrmLayout>;
});
