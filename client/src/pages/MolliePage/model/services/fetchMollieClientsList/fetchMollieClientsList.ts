import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '@/entities/MollieClient';

interface FetchArticlesListProps {
    replace?: boolean;
    page?: number;
    limit?: number;
    _q?: string;
    hasSubscriptions?: 'all' | 'yes' | 'no';
    hasMandates?: 'all' | 'yes' | 'no';
    subscriptionStatus?: 'all' | 'active' | 'not_active';
}

export interface FetchMollieClientsListResponse {
    items: MollieClient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const fetchMollieClientsList = createAsyncThunk<
    FetchMollieClientsListResponse,
    FetchArticlesListProps,
    ThunkConfig<string>
>(
    'mollieClientsPage/fetchMollieClientsList',
    async (params, thunkApi) => {
        const { extra, rejectWithValue } = thunkApi;
        const { replace, page = 1, limit = 15, ...filters } = params || {};

        try {
            const { data } = await extra.apiPrivate.get<FetchMollieClientsListResponse>('/mollie/customers', {
                params: {
                    ...filters,
                    _page: page,
                    _limit: limit,
                    _q: filters._q?.trim() || undefined,
                    hasSubscriptions: filters.hasSubscriptions === 'all' ? undefined : filters.hasSubscriptions,
                    hasMandates: filters.hasMandates === 'all' ? undefined : filters.hasMandates,
                    subscriptionStatus: filters.subscriptionStatus === 'all' ? undefined : filters.subscriptionStatus,
                },
            });

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
