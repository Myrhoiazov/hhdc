import { useMemo, useState } from 'react';
import { useDelayed } from '../useDelayed/useDelayed';

interface ListStart<Filters> {
    filters: Filters;
    page: number;
}

// The filters of a list page and its page number. `applied` is what the list is asked with: the
// typed search joins it only after a pause. Changing any filter returns to the first page — the
// old page number means nothing in a new list. `start` opens the list somewhere else than on the
// first page without filters: a page that keeps its place in the address gives it.
export const useListFilters = <Filters extends { q: string }>(
    none: Filters,
    start: ListStart<Filters> = { filters: none, page: 1 }
) => {
    const [filters, setFilters] = useState(start.filters);
    const [page, setPage] = useState(start.page);
    const q = useDelayed(filters.q).trim();
    const key = JSON.stringify({ ...filters, q });
    const applied = useMemo(() => JSON.parse(key) as Filters, [key]);
    const change = (patch: Partial<Filters>) => {
        setFilters((current) => ({ ...current, ...patch }));
        setPage(1);
    };
    return {
        filters,
        applied,
        page,
        setPage,
        change,
        filtered: Object.values(filters).some(Boolean),
        reset: () => change(none),
    };
};
