import { useCallback, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { IncidentFilters, MollieIncident } from './mollieIncidentTypes';

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

export const useIncidentActions = (
    filters: IncidentFilters,
    page: number,
    loadIncidents: (filters: IncidentFilters, page: number) => Promise<void>,
) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string>();
    const [resolvingIncidentId, setResolvingIncidentId] = useState<string>();

    const onSyncPayments = useCallback(async () => {
        setIsSyncing(true);
        try {
            const { data } = await $apiPrivate.post<SyncResult>('/mollie/sync/payments');
            setSyncMessage(`Sync payments: создано ${data.created}, обновлено ${data.updated}, пропущено ${data.skipped}, ошибок ${data.errors}`);
            await loadIncidents(filters, 1);
        } finally {
            setIsSyncing(false);
        }
    }, [filters, loadIncidents]);

    const onResolveIncident = useCallback(async (incident: MollieIncident) => {
        if (!window.confirm(`Пометить «${incident.title}» как решённую проблему?`)) {
            return;
        }
        setResolvingIncidentId(incident.id);
        try {
            await $apiPrivate.post(`/mollie/incidents/${incident.id}/resolve`);
            await loadIncidents(filters, page);
        } finally {
            setResolvingIncidentId(undefined);
        }
    }, [filters, loadIncidents, page]);

    return {
        isSyncing, syncMessage, resolvingIncidentId, onSyncPayments, onResolveIncident,
    };
};
