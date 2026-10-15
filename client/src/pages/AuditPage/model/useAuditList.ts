import { useCallback } from 'react';
import { AuditFilters, AuditOptions, listAuditPage } from '@/entities/Audit';
import { useResource } from '@/shared/lib/useResource/useResource';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';

const NO_FILTERS: AuditFilters = { q: '', entityType: '', actorUserId: '', from: '', to: '' };

export const NO_OPTIONS: AuditOptions = { entityTypes: [], actors: [] };

export const useAuditList = () => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(() => listAuditPage(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};
