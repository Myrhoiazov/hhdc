import { useCallback } from 'react';
import { EventFilters, listEventsPage } from '@/entities/Event';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';

const NO_FILTERS: EventFilters = { q: '', status: '', period: '' };

export const useEventsList = () => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(() => listEventsPage(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};
