import { useCallback } from 'react';
import { KnowledgeFilters, listKnowledge } from '@/entities/Knowledge';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';

export const SCOPES = ['GLOBAL', 'EVENT'];

export const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

const NO_FILTERS: KnowledgeFilters = { q: '', scope: '', status: '' };

export const useKnowledgeList = () => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(() => listKnowledge(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};
