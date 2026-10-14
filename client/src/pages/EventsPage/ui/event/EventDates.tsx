import { memo } from 'react';
import { Event } from '@/entities/Event';
import { formatDateTime } from '@/shared/lib/format/date';
import { Panel } from '@/shared/ui/Panel';

export const EventDates = memo(({ event }: { event: Event }) => (
    <Panel>
        <p>
            {formatDateTime(event.startAt)} — {formatDateTime(event.endAt)}
        </p>
        <p>
            {event.timezone} · {event.venueName}
        </p>
    </Panel>
));
