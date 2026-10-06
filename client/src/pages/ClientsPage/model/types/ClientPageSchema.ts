import { EntityState } from '@reduxjs/toolkit';
import { Client, ClientSortField, ClientView } from '@/entities/Client';
import { SortOrder } from '@/shared/types/sort';

export type ClientPaymentStatusFilter =
    | 'all'
    | 'linked'
    | 'unlinked'
    | 'active_subscription'
    | 'paid'
    | 'payment_issue';

export interface ClientPageSchema extends EntityState<Client, string> {
    isLoading?: boolean;
    error?: string;

    // for pagination
    page: number;
    limit: number;
    hasMore: boolean;

    //filters
    view?: ClientView
    sort: ClientSortField
    order: SortOrder
    search: string;
    branchId: string;
    paymentStatus: ClientPaymentStatusFilter;

    _inited: boolean
}
