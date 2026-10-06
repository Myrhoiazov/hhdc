import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getMollieClientsPageError,
    getMollieClientsPageIsLoading,
    getMollieClientsPageLimit,
    getMollieClientsPageMandates,
    getMollieClientsPagePage,
    getMollieClientsPageSubscriptions,
    getMollieClientsPageTotal,
    getMollieClientsPageTotalPages,
} from './mollieClientsPageSelectors';

describe('mollieClientsPageSelectors', () => {
    test('read from mollieClientsPage for list-page fields', () => {
        const state: StateSchema = fromPartial({
            mollieClientsPage: {
                isLoading: true, error: 'error', page: 2, limit: 20, total: 40, totalPages: 2,
            },
        });

        expect(getMollieClientsPageIsLoading(state)).toBe(true);
        expect(getMollieClientsPageError(state)).toBe('error');
        expect(getMollieClientsPagePage(state)).toBe(2);
        expect(getMollieClientsPageLimit(state)).toBe(20);
        expect(getMollieClientsPageTotal(state)).toBe(40);
        expect(getMollieClientsPageTotalPages(state)).toBe(2);
    });

    test('read mandates and subscriptions from customerDetailsMandates', () => {
        const mandates = [{ id: '1' }];
        const subscriptions = [{ id: '1' }];
        const state: StateSchema = fromPartial({
            customerDetailsMandates: { isLoading: true, error: 'error', mandates, subscriptions },
        });

        expect(getMollieClientsPageMandates(state)).toEqual(mandates);
        expect(getMollieClientsPageSubscriptions(state)).toEqual(subscriptions);
        expect(getMollieClientsPageIsLoading(state)).toBe(true);
        expect(getMollieClientsPageError(state)).toBe('error');
    });

    test('fall back to defaults when neither slice is mounted', () => {
        const state = {} as StateSchema;

        expect(getMollieClientsPageIsLoading(state)).toBe(false);
        expect(getMollieClientsPageError(state)).toBeUndefined();
        expect(getMollieClientsPagePage(state)).toBe(1);
        expect(getMollieClientsPageLimit(state)).toBe(15);
        expect(getMollieClientsPageTotal(state)).toBe(0);
        expect(getMollieClientsPageTotalPages(state)).toBe(1);
        expect(getMollieClientsPageMandates(state)).toEqual([]);
        expect(getMollieClientsPageSubscriptions(state)).toEqual([]);
    });
});
