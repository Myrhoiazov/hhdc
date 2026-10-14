import { memo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getEvent } from '@/entities/Event';
import { Can, useCan } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { EventDocuments } from '@/widgets/EventDocuments';
import { EventExpenses } from './expenses/EventExpenses';
import { EventPeople } from './people/EventPeople';
import { EventSalesPanel } from './sales/EventSalesPanel';
import { EventSectionNav } from './EventSectionNav';
import { EventTeam } from './team/EventTeam';
import { EventTicketTypes } from './EventTicketTypes';
import { EventDates } from './EventDates';
import { useCounter } from '../../model/useCounter';

// Sales and expenses are money: both are shown only to staff who may see finance.
interface EventMoneyProps {
    eventId: string;
    can: Can;
    version: number;
    onChanged: () => void;
}

const EventMoney = memo(({ eventId, can, version, onChanged }: EventMoneyProps) => {
    if (!can('finance.read')) return null;
    return (
        <>
            <EventSalesPanel eventId={eventId} />
            <EventExpenses
                eventId={eventId}
                canEdit={can('events.write')}
                version={version}
                onChanged={onChanged}
            />
        </>
    );
});

export const EventPage = memo(() => {
    const { id = '' } = useParams();
    const load = useCallback(() => getEvent(id), [id]);
    const event = useResource(load);
    const can = useCan();
    const [teamVersion, teamChanged] = useCounter();
    const [expensesVersion, expensesChanged] = useCounter();
    return (
        <CrmLayout title={event.data?.name || 'Event'}>
            <RequestState error={event.error} loading={event.loading} />
            {event.data && (
                <>
                    <EventSectionNav />
                    <EventDates event={event.data} />
                    <EventMoney
                        eventId={id}
                        can={can}
                        version={teamVersion}
                        onChanged={expensesChanged}
                    />
                    <EventTicketTypes eventId={id} />
                    <EventPeople event={event.data} onSaved={() => void event.refresh()} />
                    <EventTeam
                        eventId={id}
                        canEdit={can('events.write')}
                        seesMoney={can('finance.read')}
                        version={expensesVersion}
                        onChanged={teamChanged}
                    />
                    <EventDocuments eventId={id} />
                </>
            )}
        </CrmLayout>
    );
});
