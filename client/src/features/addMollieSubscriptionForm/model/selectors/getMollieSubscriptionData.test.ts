import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getMollieSubscriptionCustomers,
    getMollieSubscriptionData,
    getMollieSubscriptionError,
    getMollieSubscriptionLoading,
} from './getMollieSubscriptionData';

describe('addMollieSubscriptionForm selectors', () => {
    test('getMollieSubscriptionData returns the data', () => {
        const data = { customerId: '1' };
        const state: DeepPartial<StateSchema> = { addMollieSubscriptionForm: { data } };

        expect(getMollieSubscriptionData(state as StateSchema)).toEqual(data);
    });

    test('getMollieSubscriptionCustomers returns the customers list', () => {
        const customers = [{ id: '1' }];
        const state: DeepPartial<StateSchema> = { addMollieSubscriptionForm: { customers } };

        expect(getMollieSubscriptionCustomers(state as StateSchema)).toEqual(customers);
    });

    test('getMollieSubscriptionError defaults to an empty string', () => {
        expect(getMollieSubscriptionError({} as StateSchema)).toBe('');
    });

    test('getMollieSubscriptionError returns the error', () => {
        const state: DeepPartial<StateSchema> = { addMollieSubscriptionForm: { error: 'boom' } };
        expect(getMollieSubscriptionError(state as StateSchema)).toBe('boom');
    });

    test('getMollieSubscriptionLoading defaults to false', () => {
        expect(getMollieSubscriptionLoading({} as StateSchema)).toBe(false);
    });

    test('getMollieSubscriptionLoading returns the loading flag', () => {
        const state: DeepPartial<StateSchema> = { addMollieSubscriptionForm: { isLoading: true } };
        expect(getMollieSubscriptionLoading(state as StateSchema)).toBe(true);
    });
});
