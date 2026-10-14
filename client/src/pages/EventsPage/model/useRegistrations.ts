import { useCallback } from 'react';
import { listEventRegistrations, RegistrationFilters } from '@/entities/Registration';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';

const NO_FILTERS: RegistrationFilters = { q: '', status: '' };

export const useRegistrations = (eventId: string) => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(
        () => listEventRegistrations(eventId, applied, page),
        [eventId, applied, page]
    );
    return { ...list, list: useResource(load) };
};
