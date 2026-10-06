import { useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClientStudentLink } from '@/entities/MollieClient';
import { Client } from '@/entities/Client';
import { getStudentName } from './studentLinksHelpers';

export const useStudentLinksData = (customerId: string, version: number) => {
    const [clientLinks, setClientLinks] = useState<MollieClientStudentLink[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError(false);

        Promise.all([
            $apiPrivate.get<MollieClientStudentLink[]>(`/mollie/customers/${customerId}/student-links`),
            $apiPrivate.get<Client[]>('/clients'),
        ])
            .then(([linksResponse, clientsResponse]) => {
                setClientLinks(linksResponse.data ?? []);
                setClients(clientsResponse.data ?? []);
            })
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, [customerId, version]);

    const linkedClientIds = useMemo(
        () => new Set(clientLinks
            .map((link) => link.client?.id)
            .filter(Boolean)
            .map(String)),
        [clientLinks],
    );

    const availableClientOptions = useMemo(() => clients
        .map((client) => ({
            value: String(client.id),
            content: `${getStudentName(client)}${client.email ? ` · ${client.email}` : ''}`,
        }))
        .filter((option) => !linkedClientIds.has(option.value)), [clients, linkedClientIds]);

    return {
        clientLinks, setClientLinks, isLoading, error, availableClientOptions,
    };
};
