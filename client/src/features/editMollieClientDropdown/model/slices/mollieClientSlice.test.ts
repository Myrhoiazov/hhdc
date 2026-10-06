import { MollieClient } from '@/entities/MollieClient';
import { fetchMollieClientData } from '../services/fetchMollieClientData/fetchMollieClientData';
import { updateMollieClientData } from '../services/updateMollieClientData/updateMollieClientData';
import { mollieClientActions, mollieClientReducer } from './mollieClientSlice';
import { MollieClientFormSchema } from '../types/mollieClientFormSchema';

describe('mollieClientSlice', () => {
    test('returns the initial state', () => {
        const state = mollieClientReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ readonly: true, isLoading: false, error: undefined, data: undefined });
    });

    test('setReadonly sets the readonly flag', () => {
        const state = mollieClientReducer({ readonly: true, isLoading: false } as MollieClientFormSchema, mollieClientActions.setReadonly(false));
        expect(state.readonly).toBe(false);
    });

    test('cancelEdit resets the form to the last saved data', () => {
        const data = { id: '1', email: 'a@b.com' } as MollieClient;
        const initialState: MollieClientFormSchema = {
            readonly: false,
            isLoading: false,
            data,
            form: { id: '1', email: 'changed@b.com' } as MollieClient,
        };

        const state = mollieClientReducer(initialState, mollieClientActions.cancelEdit());

        expect(state.readonly).toBe(true);
        expect(state.form).toEqual(data);
    });

    test('cleanForm clears the form and data', () => {
        const initialState: MollieClientFormSchema = {
            readonly: false,
            isLoading: false,
            data: { id: '1' } as MollieClient,
            form: { id: '1' } as MollieClient,
        };

        const state = mollieClientReducer(initialState, mollieClientActions.cleanForm());

        expect(state.readonly).toBe(true);
        expect(state.form).toBeUndefined();
        expect(state.data).toBeUndefined();
    });

    test('updateProfile merges the payload into the form', () => {
        const initialState: MollieClientFormSchema = {
            readonly: false,
            isLoading: false,
            form: { id: '1', email: 'a@b.com' } as MollieClient,
        };

        const state = mollieClientReducer(
            initialState,
            mollieClientActions.updateProfile({ givenName: 'Ivan' } as MollieClient),
        );

        expect(state.form).toEqual({ id: '1', email: 'a@b.com', givenName: 'Ivan' });
    });

    test('stores the client on fetchMollieClientData.fulfilled', () => {
        const client = { id: '1', email: 'a@b.com' } as MollieClient;
        const initialState: MollieClientFormSchema = { readonly: true, isLoading: true };

        const state = mollieClientReducer(initialState, fetchMollieClientData.fulfilled(client, 'requestId', '1'));

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(client);
        expect(state.form).toEqual(client);
    });

    test('stores the error on fetchMollieClientData.rejected', () => {
        const initialState: MollieClientFormSchema = { readonly: true, isLoading: true };

        const state = mollieClientReducer(
            initialState,
            fetchMollieClientData.rejected(new Error('fail'), 'requestId', '1', 'unknown error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('unknown error');
    });

    test('stores the client and switches to readonly on updateMollieClientData.fulfilled', () => {
        const client = { id: '1', email: 'a@b.com' } as MollieClient;
        const initialState: MollieClientFormSchema = { readonly: false, isLoading: true };

        const state = mollieClientReducer(initialState, updateMollieClientData.fulfilled(client, 'requestId'));

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(client);
        expect(state.form).toEqual(client);
        expect(state.readonly).toBe(true);
    });

    test('clears isLoading on updateMollieClientData.rejected', () => {
        const initialState: MollieClientFormSchema = { readonly: false, isLoading: true };

        const state = mollieClientReducer(
            initialState,
            updateMollieClientData.rejected(new Error('fail'), 'requestId', undefined, 'error validation'),
        );

        expect(state.isLoading).toBe(false);
    });
});
