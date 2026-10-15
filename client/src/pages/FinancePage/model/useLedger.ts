import { useCallback, useState } from 'react';
import {
    getLedgerSummary,
    LedgerCategory,
    LedgerFilters,
    listLedgerPage,
} from '@/entities/Finance';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';

export type LedgerView = 'dates' | 'categories';

const NO_FILTERS: LedgerFilters = { q: '', category: '', eventId: '', from: '', to: '' };

export const useLedger = () => {
    const list = useListFilters(NO_FILTERS);
    const [view, setView] = useState<LedgerView>('dates');
    const { applied, page, change } = list;
    const loadList = useCallback(() => listLedgerPage(applied, page), [applied, page]);
    const loadSummary = useCallback(() => getLedgerSummary(applied), [applied]);
    const openCategory = (chosen: string) => {
        change({ category: chosen as LedgerCategory });
        setView('dates');
    };
    return {
        ...list,
        view,
        setView,
        openCategory,
        list: useResource(loadList),
        summary: useResource(loadSummary),
    };
};
