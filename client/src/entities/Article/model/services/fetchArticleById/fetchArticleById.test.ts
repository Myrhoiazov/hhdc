import { fetchArticleById } from './fetchArticleById';

const dispatch = jest.fn();
const extra = { api: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.api.get.mockClear();
});

describe('fetchArticleById', () => {
    test('fetches the article and fulfills with it', async () => {
        const article = { id: '1', title: 'Title' };
        extra.api.get.mockResolvedValue({ data: article });

        const result = await fetchArticleById('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.get).toHaveBeenCalledWith('/articles/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(article);
    });

    test('rejects when the response has no data', async () => {
        extra.api.get.mockResolvedValue({ data: undefined });

        const result = await fetchArticleById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });

    test('rejects when the API call fails', async () => {
        extra.api.get.mockRejectedValue(new Error('network error'));

        const result = await fetchArticleById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
