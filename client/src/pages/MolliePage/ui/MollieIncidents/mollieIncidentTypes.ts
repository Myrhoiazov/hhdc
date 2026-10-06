export type IncidentTypeFilter = 'all' | 'payments' | 'subscriptions' | 'customers';

export interface IncidentCustomer {
    id: number;
    mollieId?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    payerName?: string;
    payerRelation?: string;
    linkSource?: string;
    client?: {
        id: number;
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
    } | null;
    clientLinks?: {
        id: number;
        payerRelation?: string;
        linkSource?: string;
        isPrimary?: boolean;
        client?: {
            id: number;
            firstName?: string;
            lastName?: string;
            email?: string;
            phoneNumber?: string;
        };
    }[];
}

export interface MollieIncident {
    id: string;
    type: 'payment' | 'subscription' | 'customer';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    status: string;
    amountValue?: string | number;
    amountCurrency?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    customer?: IncidentCustomer | null;
}

export interface MollieIncidentsResponse {
    items: MollieIncident[];
    totals: {
        total: number;
        payments: number;
        subscriptions: number;
        customers: number;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IncidentFilters {
    _q: string;
    type: IncidentTypeFilter;
}

export const defaultFilters: IncidentFilters = {
    _q: '',
    type: 'all',
};
