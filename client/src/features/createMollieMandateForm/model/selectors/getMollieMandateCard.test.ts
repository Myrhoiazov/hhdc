import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getMollieMandateCustomers,
    getMollieMandateData,
    getMollieMandateError,
    getMollieMandateLoading,
} from './getMollieMandateCard';

describe('createMollieMandateForm selectors', () => {
    test('getMollieMandateData returns the data', () => {
        const data = { customerId: '1' };
        const state: DeepPartial<StateSchema> = { createMollieMandateForm: { data } };

        expect(getMollieMandateData(state as StateSchema)).toEqual(data);
    });

    test('getMollieMandateCustomers returns the customers list', () => {
        const customers = [{ id: '1' }];
        const state: DeepPartial<StateSchema> = { createMollieMandateForm: { customers } };

        expect(getMollieMandateCustomers(state as StateSchema)).toEqual(customers);
    });

    test('getMollieMandateError defaults to an empty string', () => {
        expect(getMollieMandateError({} as StateSchema)).toBe('');
    });

    test('getMollieMandateLoading defaults to false', () => {
        expect(getMollieMandateLoading({} as StateSchema)).toBe(false);
    });
});
