import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Event } from '@/entities/Event';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { listStyles as own } from '@/shared/ui/ListTable';
import { eventDates } from '../../model/eventDates';

const EventRow = memo(({ event }: { event: Event }) => (
    <tr>
        <td>
            <Link className={own.name} to={`/events/${event.id}`}>
                {event.name}
            </Link>
        </td>
        <td className={own.secondary}>{eventDates(event)}</td>
        <td className={`${own.secondary} ${own.optional}`}>
            {[event.venueName, event.city].filter(Boolean).join(', ') || '—'}
        </td>
        <td>
            <StatusBadge status={event.status} />
        </td>
        <td className={own.number}>{event._count?.tickets ?? 0}</td>
        <td className={`${own.number} ${own.optional}`}>{event._count?.registrations ?? 0}</td>
    </tr>
));

export const EventsTable = memo(({ events }: { events: Event[] }) => {
    const { t } = useTranslation();
    return (
        <div className={own.tableScroll}>
            <table className={own.table}>
                <thead>
                    <tr>
                        <th>{t('Name')}</th>
                        <th>{t('Dates')}</th>
                        <th className={own.optional}>{t('Venue')}</th>
                        <th>{t('Status')}</th>
                        <th className={own.number}>{t('Tickets')}</th>
                        <th className={`${own.number} ${own.optional}`}>{t('Registrations')}</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <EventRow key={event.id} event={event} />
                    ))}
                </tbody>
            </table>
        </div>
    );
});
