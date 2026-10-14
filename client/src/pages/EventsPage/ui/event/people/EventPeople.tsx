import { memo, useCallback, useState } from 'react';
import { Event } from '@/entities/Event';
import { Registrations } from './Registrations';
import { Choreographers } from './Choreographers';
import { AddPerson } from './AddPerson';

// Everyone connected to the event: the registered people, the choreographers, and a way to add one.
export const EventPeople = memo(({ event, onSaved }: { event: Event; onSaved: () => void }) => {
    const [version, setVersion] = useState(0);
    const saved = useCallback(() => {
        setVersion((current) => current + 1);
        onSaved();
    }, [onSaved]);
    return (
        <>
            <Registrations key={version} eventId={event.id} />
            <Choreographers event={event} />
            <AddPerson eventId={event.id} onSaved={saved} />
        </>
    );
});
