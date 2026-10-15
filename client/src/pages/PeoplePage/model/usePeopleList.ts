import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listPeoplePage, PeopleFilters } from '@/entities/Person';
import { useResource } from '@/shared/lib/useResource/useResource';
import { readPeopleList, writePeopleList } from './peopleListUrl';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';

const NO_FILTERS: PeopleFilters = { q: '', role: '', source: '', purchases: '' };

// The list starts from what the address says and keeps the address in step with itself, without
// adding a history entry per filter or page: "back" leaves the list, it does not replay it.
export const usePeopleList = () => {
    const [params, setParams] = useSearchParams();
    const [start] = useState(() => readPeopleList(params));
    const list = useListFilters(NO_FILTERS, start);
    const { applied, page } = list;
    const address = writePeopleList(applied, page);
    useEffect(() => {
        if (params.toString() !== address) setParams(address, { replace: true });
    }, [params, address, setParams]);
    const load = useCallback(() => listPeoplePage(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};
