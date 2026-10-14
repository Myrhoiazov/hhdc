import { Event } from '@/entities/Event';
import { formatDate } from '@/shared/lib/format/date';

// One date for a one-day event, a range otherwise.
export const eventDates = (event: Event): string => {
    const [start, end] = [formatDate(event.startAt), formatDate(event.endAt)];
    return start === end ? start : `${start} – ${end}`;
};
