import { StateSchema } from '@/app/providers/StoreProvider';
import { getTransactionFormData } from './getTransactionFormData';

describe('getTransactionFormData', () => {
    test('returns the form data', () => {
        const data = { id: '1', amount: 100 };
        const state: DeepPartial<StateSchema> = { addTransactionForm: { data } };

        expect(getTransactionFormData(state as StateSchema)).toEqual(data);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getTransactionFormData({} as StateSchema)).toBeUndefined();
    });
});
