import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { ClientSortField, ClientView } from '@/entities/Client';
import {
    getClientsPageBranchId,
    getClientsPageError,
    getClientsPageHasMore,
    getClientsPageInited,
    getClientsPageIsLoading,
    getClientsPageLimit,
    getClientsPageNum,
    getClientsPageOrder,
    getClientsPagePaymentStatus,
    getClientsPageSearch,
    getClientsPageSort,
    getClientsPageView,
} from './clientsPageSelectors';

describe('clientsPageSelectors', () => {
    test('return the stored values', () => {
        const state: StateSchema = fromPartial({
            clientsPage: {
                isLoading: true,
                error: 'error',
                page: 3,
                limit: 20,
                hasMore: false,
                _inited: true,
                view: ClientView.SMALL,
                search: 'ivan',
                sort: ClientSortField.TITLE,
                order: 'desc',
                branchId: '2',
                paymentStatus: 'paid',
            },
        });

        expect(getClientsPageIsLoading(state)).toBe(true);
        expect(getClientsPageError(state)).toBe('error');
        expect(getClientsPageNum(state)).toBe(3);
        expect(getClientsPageLimit(state)).toBe(20);
        expect(getClientsPageHasMore(state)).toBe(false);
        expect(getClientsPageInited(state)).toBe(true);
        expect(getClientsPageView(state)).toBe(ClientView.SMALL);
        expect(getClientsPageSearch(state)).toBe('ivan');
        expect(getClientsPageSort(state)).toBe(ClientSortField.TITLE);
        expect(getClientsPageOrder(state)).toBe('desc');
        expect(getClientsPageBranchId(state)).toBe('2');
        expect(getClientsPagePaymentStatus(state)).toBe('paid');
    });

    test('fall back to defaults when the slice is not mounted', () => {
        const state = {} as StateSchema;

        expect(getClientsPageIsLoading(state)).toBe(false);
        expect(getClientsPageNum(state)).toBe(1);
        expect(getClientsPageLimit(state)).toBe(9);
        expect(getClientsPageView(state)).toBe(ClientView.BIG);
        expect(getClientsPageSearch(state)).toBe('');
        expect(getClientsPageSort(state)).toBe(ClientSortField.CREATED);
        expect(getClientsPageOrder(state)).toBe('asc');
        expect(getClientsPageBranchId(state)).toBe('all');
        expect(getClientsPagePaymentStatus(state)).toBe('all');
    });
});
