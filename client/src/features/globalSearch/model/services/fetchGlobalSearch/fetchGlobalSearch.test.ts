import { $apiPrivate } from '@/shared/api/api';
import { fetchGlobalSearch } from './fetchGlobalSearch';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchGlobalSearch', () => {
    test('GETs /search with the query and forwards the abort signal', async () => {
        const response = { clients: [], groups: [] };
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: response });
        const controller = new AbortController();

        const result = await fetchGlobalSearch('Ivan', controller.signal);

        expect($apiPrivate.get).toHaveBeenCalledWith('/search', {
            params: { q: 'Ivan' },
            signal: controller.signal,
        });
        expect(result).toEqual(response);
    });
});
