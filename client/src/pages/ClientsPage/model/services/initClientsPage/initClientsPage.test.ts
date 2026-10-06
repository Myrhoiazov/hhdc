import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { ClientSortField } from '@/entities/Client';
import { clientsPageActions } from '../../slices/clientsPageSlice';
import { initClientsPage } from './initClientsPage';

// The thunk reads the raw URL value and casts it to ClientSortField without validating it.
const sortFromUrl = 'CREATED' as ClientSortField;

jest.mock('../fetchClientsList/fetchClientsList', () => ({
    fetchClientsList: jest.fn(() => ({ type: 'clientsPage/fetchClientsList/mocked' })),
}));

const dispatch = jest.fn();
const extra = {};

function stateWith(inited: boolean): () => StateSchema {
    return () => fromPartial({ clientsPage: { _inited: inited } });
}

beforeEach(() => {
    dispatch.mockClear();
});

describe('initClientsPage', () => {
    test('reads filters from the URL, dispatches them and fetches the list when not yet inited', async () => {
        const searchParams = new URLSearchParams('order=desc&sort=CREATED&search=ivan&branchId=2&paymentStatus=paid');

        await initClientsPage(searchParams)(dispatch, stateWith(false), extra as never);

        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.setOrder('desc'));
        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.setSort(sortFromUrl));
        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.setSearch('ivan'));
        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.setBranchId('2'));
        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.setPaymentStatus('paid'));
        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.initState());
        expect(dispatch).toHaveBeenCalledWith({ type: 'clientsPage/fetchClientsList/mocked' });
    });

    test('does nothing when already inited', async () => {
        const searchParams = new URLSearchParams('search=ivan');

        await initClientsPage(searchParams)(dispatch, stateWith(true), extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(clientsPageActions.setSearch(expect.anything()));
        expect(dispatch).not.toHaveBeenCalledWith(clientsPageActions.initState());
        expect(dispatch).not.toHaveBeenCalledWith({ type: 'clientsPage/fetchClientsList/mocked' });
    });

    test('skips dispatching filters that are absent from the URL', async () => {
        const searchParams = new URLSearchParams();

        await initClientsPage(searchParams)(dispatch, stateWith(false), extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(clientsPageActions.setSearch(expect.anything()));
        expect(dispatch).toHaveBeenCalledWith(clientsPageActions.initState());
    });
});
