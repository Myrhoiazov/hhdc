import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { getClientsPageInited } from '../../selectors/clientsPageSelectors';
import { clientsPageActions } from '../../slices/clientsPageSlice';
import { fetchClientsList } from '../fetchClientsList/fetchClientsList';
import { ClientSortField } from '@/entities/Client';
import { SortOrder } from '@/shared/types/sort';
import { ClientPaymentStatusFilter } from '../../types/ClientPageSchema';


export const initClientsPage = createAsyncThunk<
    void,
    URLSearchParams,
    ThunkConfig<string>
>(
    'clientsPage/initClientPage',
    async (searchParams, thunkApi) => {
        const { getState, dispatch } = thunkApi;
        const inited = getClientsPageInited(getState());

        if (!inited) {
            const orderFromUrl = searchParams.get('order') as SortOrder;
            const sortFromUrl = searchParams.get('sort') as ClientSortField;
            const searchFromUrl = searchParams.get('search');
            const branchIdFromUrl = searchParams.get('branchId');
            const paymentStatusFromUrl = searchParams.get('paymentStatus') as ClientPaymentStatusFilter;

            if (orderFromUrl) {
                dispatch(clientsPageActions.setOrder(orderFromUrl));
            }
            if (sortFromUrl) {
                dispatch(clientsPageActions.setSort(sortFromUrl));
            }
            if (searchFromUrl) {
                dispatch(clientsPageActions.setSearch(searchFromUrl));
            }
            if (branchIdFromUrl) {
                dispatch(clientsPageActions.setBranchId(branchIdFromUrl));
            }
            if (paymentStatusFromUrl) {
                dispatch(clientsPageActions.setPaymentStatus(paymentStatusFromUrl));
            }

            dispatch(clientsPageActions.initState());
            dispatch(fetchClientsList({}));
        }
    },
);
