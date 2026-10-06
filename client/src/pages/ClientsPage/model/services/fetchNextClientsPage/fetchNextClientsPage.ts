import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    getClientsPageHasMore,
    getClientsPageIsLoading,
    getClientsPageNum,
} from '../../selectors/clientsPageSelectors';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { clientsPageActions } from '../../slices/clientsPageSlice';

export const fetchNextClientsPage = createAsyncThunk<
    void,
    void,
    ThunkConfig<string>
>('clientsPage/fetchNextClientsPage', async (_, thunkApi) => {
    const { getState, dispatch } = thunkApi;
    const hasMore = getClientsPageHasMore(getState());
    const page = getClientsPageNum(getState());
    const isLoading = getClientsPageIsLoading(getState());

    if (hasMore && !isLoading) {
        dispatch(clientsPageActions.setPage(page + 1));
        // dispatch(fetchClientsList({ page: page + 1 }));
    }
});
