import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchAllMandates } from './fetchAllMandates';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };
const getState = () => ({}) as StateSchema;

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchAllMandates', () => {
    test('fetches mandates for the given customer', async () => {
        const mandates = [{ id: '1' }];
        extra.apiPrivate.get.mockResolvedValue({ data: mandates });

        const result = await fetchAllMandates({ customerId: 'cst_1' })(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/mandates/cst_1');
        expect(result.payload).toEqual(mandates);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchAllMandates({ customerId: 'cst_1' })(dispatch, getState, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
