import { memo, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Event, getEvent, listTicketTypes } from '@/entities/Event';
import { Can, useCan } from '@/entities/User';
import { formatDateTime } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { useNumbers } from '@/shared/lib/format/useNumbers';
import { Panel } from '@/shared/ui/Panel';
import { EventDocuments } from './choreographers/EventDocuments';
import { EventExpenses } from './EventExpenses';
import { EventPeople } from './EventPeople';
import { EventSalesPanel } from './EventSalesPanel';
import { EventSectionNav } from './EventSectionNav';
import { EventTeam } from './EventTeam';
import cls from '@/shared/ui/layout/layout.module.scss';

// What the event sells, as read from the ticketing provider; prices are not edited in the CRM.
const EventTicketTypes = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listTicketTypes(eventId), [eventId]);
    const types = useResource(load);
    const { money } = useNumbers(types.data?.[0]?.currency);
    return <Panel id="event-ticket-types" aria-label={t('Ticket types')}><h2>{t('Ticket types')}</h2>
        <RequestState error={types.error} loading={types.loading} />
        {types.data?.map(type => <div className={cls.row} key={type.id}><span>{type.name}</span><span>{money(type.price)}</span><span>{t('Sold: {{count}}', { count: type.soldCount })}</span><span className={cls.muted}>{t(`Ticket status: ${type.status}`, { defaultValue: type.status })}</span></div>)}
        {types.data?.length === 0 && <p className={cls.muted}>{t('No ticket types yet')}</p>}
    </Panel>;
});

const EventDates = memo(({ event }: { event: Event }) => (
    <Panel>
        <p>{formatDateTime(event.startAt)} — {formatDateTime(event.endAt)}</p>
        <p>{event.timezone} · {event.venueName}</p>
    </Panel>
));

// Sales and expenses are money: both are shown only to staff who may see finance.
interface EventMoneyProps { eventId: string; can: Can; version: number; onChanged: () => void }

const EventMoney = memo(({ eventId, can, version, onChanged }: EventMoneyProps) => {
    if (!can('finance.read')) return null;
    return <><EventSalesPanel eventId={eventId} /><EventExpenses eventId={eventId} canEdit={can('events.write')} version={version} onChanged={onChanged} /></>;
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
    const can = useCan();
    const [teamVersion, teamChanged] = useCounter();
    const [expensesVersion, expensesChanged] = useCounter();
    return <CrmLayout title={event.data?.name || 'Event'}><RequestState error={event.error} loading={event.loading} />
        {event.data && <>
            <EventSectionNav />
            <EventDates event={event.data} />
            <EventMoney eventId={id} can={can} version={teamVersion} onChanged={expensesChanged} />
            <EventTicketTypes eventId={id} />
            <EventPeople event={event.data} onSaved={() => void event.refresh()} />
            <EventTeam eventId={id} canEdit={can('events.write')} seesMoney={can('finance.read')}
                version={expensesVersion} onChanged={teamChanged} />
            <EventDocuments eventId={id} />
        </>}
    </CrmLayout>;
});
