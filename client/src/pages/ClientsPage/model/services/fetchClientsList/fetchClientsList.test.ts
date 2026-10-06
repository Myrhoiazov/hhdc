import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { ClientSortField } from '@/entities/Client';
import { fetchClientsList } from './fetchClientsList';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

function stateWith(overrides: Record<string, unknown> = {}): () => StateSchema {
    return () => fromPartial({
        clientsPage: {
            search: '',
            sort: ClientSortField.CREATED,
            order: 'asc',
            branchId: 'all',
            paymentStatus: 'all',
            ...overrides,
        },
    });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchClientsList', () => {
    test('fetches clients using the current filters from state', async () => {
        const clients = [{ id: '1' }];
        extra.apiPrivate.get.mockResolvedValue({ data: clients });

        const result = await fetchClientsList({})(dispatch, stateWith({ search: 'ivan', branchId: '2' }), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/clients', {
            params: {
                _q: 'ivan',
                _sortBy: ClientSortField.CREATED,
                _order: 'asc',
                _branchId: '2',
                _paymentStatus: null,
            },
        });
        expect(result.payload).toEqual(clients);
    });

    test('sends null for "all" branch and payment status', async () => {
        extra.apiPrivate.get.mockResolvedValue({ data: [] });

        await fetchClientsList({})(dispatch, stateWith(), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/clients', expect.objectContaining({
            params: expect.objectContaining({ _branchId: null, _paymentStatus: null }),
        }));
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchClientsList({})(dispatch, stateWith(), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
