import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchNextClientsPage } from './fetchNextClientsPage';
import { clientsPageActions } from '../../slices/clientsPageSlice';

const dispatch = jest.fn();
const extra = {};

describe('fetchNextClientsPage', () => {
    test('advances the page when more clients are available and nothing is loading', async () => {
        const state: StateSchema = fromPartial({ clientsPage: { page: 2, hasMore: true, isLoading: false } });

        await fetchNextClientsPage()(dispatch, () => state, extra as never);

        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.setPage(3));
    });

    test('does nothing when there are no more clients to load', async () => {
        const state: StateSchema = fromPartial({ clientsPage: { page: 2, hasMore: false, isLoading: false } });

        await fetchNextClientsPage()(dispatch, () => state, extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(clientsPageActions.setPage(expect.anything()));
    });

    test('does nothing while a page is already loading', async () => {
        const state: StateSchema = fromPartial({ clientsPage: { page: 2, hasMore: true, isLoading: true } });

        await fetchNextClientsPage()(dispatch, () => state, extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(clientsPageActions.setPage(expect.anything()));
    });
});
