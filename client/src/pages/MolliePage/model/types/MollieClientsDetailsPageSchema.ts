import { EntityState } from '@reduxjs/toolkit';
import { MollieClient } from '@/entities/MollieClient';
import { Mandate } from '@/entities/Mandate';
import { MollieSubscription } from '@/entities/MollieSubscription';

export interface MollieClientsDetailsPageSchema extends EntityState<MollieClient, string> {
    isLoading?: boolean;
    error?: string;
    mandates?: Mandate[];
    subscriptions?: MollieSubscription[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;

    _inited: boolean
}
