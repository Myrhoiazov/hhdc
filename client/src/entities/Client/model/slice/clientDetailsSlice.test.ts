import { fetchClientById } from '../services/fetchClientById/fetchClientById';
import { clientDetailsReducer } from './clientDetailsSlice';
import { ClientDetailsSchema } from '../types/clientDetailsSchema';
import { Client } from '../types/client';

describe('clientDetailsSlice', () => {
    test('returns the initial state', () => {
        const state = clientDetailsReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({
            isLoading: false,
            error: undefined,
            data: undefined,
        });
    });

    test('sets isLoading and clears error on pending', () => {
        const initialState: DeepPartial<ClientDetailsSchema> = { error: { status: 500, message: 'boom' } };
        const state = clientDetailsReducer(
            initialState as ClientDetailsSchema,
            fetchClientById.pending('requestId', '1'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('stores the client and clears loading on fulfilled', () => {
        const client = { id: '1', firstName: 'Иван' } as Client;
        const initialState: DeepPartial<ClientDetailsSchema> = { isLoading: true };
        const state = clientDetailsReducer(
            initialState as ClientDetailsSchema,
            fetchClientById.fulfilled(client, 'requestId', '1'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(client);
    });

    test('stores the error and clears loading on rejected', () => {
        const error = { status: 500, message: 'boom' };
        const initialState: DeepPartial<ClientDetailsSchema> = { isLoading: true };
        const state = clientDetailsReducer(
            initialState as ClientDetailsSchema,
            fetchClientById.rejected(new Error('fail'), 'requestId', '1', error),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toEqual(error);
    });
});
