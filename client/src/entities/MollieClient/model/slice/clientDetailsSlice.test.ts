import { fetchClientById } from '../services/fetchClientById/fetchClientById';
import { mollieClientDetailsSliceReducer } from './clientDetailsSlice';
import { MollieClientDetailsSchema } from '../types/molliCclientDetailsSchema';
import { MollieClient } from '../types/mollieClient';

describe('mollieClientDetailsSlice', () => {
    test('returns the initial state', () => {
        const state = mollieClientDetailsSliceReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({
            isLoading: false,
            error: undefined,
            data: undefined,
        });
    });

    test('sets isLoading and clears error on pending', () => {
        const initialState: DeepPartial<MollieClientDetailsSchema> = { error: 'boom' };
        const state = mollieClientDetailsSliceReducer(
            initialState as MollieClientDetailsSchema,
            fetchClientById.pending('requestId', '1'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('stores the client and clears loading on fulfilled', () => {
        const client = { id: '1', name: 'Client B.V.' } as MollieClient;
        const initialState: DeepPartial<MollieClientDetailsSchema> = { isLoading: true };
        const state = mollieClientDetailsSliceReducer(
            initialState as MollieClientDetailsSchema,
            fetchClientById.fulfilled(client, 'requestId', '1'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(client);
    });

    test('stores the error and clears loading on rejected', () => {
        const initialState: DeepPartial<MollieClientDetailsSchema> = { isLoading: true };
        const state = mollieClientDetailsSliceReducer(
            initialState as MollieClientDetailsSchema,
            fetchClientById.rejected(new Error('fail'), 'requestId', '1', 'some error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('some error');
    });
});
