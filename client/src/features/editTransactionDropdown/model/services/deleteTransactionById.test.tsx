import { deleteTransactionById } from './deleteTransactionById';

const dispatch = jest.fn();
const extra = { apiPrivate: { delete: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.delete.mockClear();
});

describe('deleteTransactionById', () => {
    test('deletes the transaction and fulfills with the response payload', async () => {
        const transaction = { id: '1' };
        extra.apiPrivate.delete.mockResolvedValue({ data: transaction });

        const result = await deleteTransactionById('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.delete).toHaveBeenCalledWith('/transactions/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(transaction);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.delete.mockRejectedValue(new Error('network error'));

        const result = await deleteTransactionById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('delete');
    });
});
