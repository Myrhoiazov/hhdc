import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Client } from '@/entities/Client';
import {
    getClientsPageBranchId,
    getClientsPageOrder,
    getClientsPagePaymentStatus,
    getClientsPageSearch,
    getClientsPageSort,
} from '../../selectors/clientsPageSelectors';
import { addQueryParams } from '@/shared/lib/url/addQueryParams/addQueryParams';

interface FetchArticlesListProps {
    replace?: boolean;
    noQuery?: boolean
}


export const fetchClientsList = createAsyncThunk<
    Client[],
    FetchArticlesListProps,
    ThunkConfig<string>
>(
    'clientsPage/fetchClientsList',
    async (noQuery, thunkApi) => {
        const { extra, rejectWithValue, getState } = thunkApi;
        const search = getClientsPageSearch(getState());
        const sort = getClientsPageSort(getState());
        const order = getClientsPageOrder(getState());
        const branchId = getClientsPageBranchId(getState());
        const paymentStatus = getClientsPagePaymentStatus(getState());

        // if (!noQuery && noQuery === undefined) {
        // }
        addQueryParams({
            sort,
            order,
            search,
            branchId,
            paymentStatus,
        });

        try {
            const { data } = await extra.apiPrivate.get<Client[]>('/clients', {
                params: {
                    _q: search,
                    _sortBy: sort,
                    _order: order,
                    _branchId: branchId === 'all' ? null : branchId,
                    _paymentStatus: paymentStatus === 'all' ? null : paymentStatus,
                }
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
