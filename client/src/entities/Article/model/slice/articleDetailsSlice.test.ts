import { fetchArticleById } from '../services/fetchArticleById/fetchArticleById';
import { articleDetailsReducer } from './articleDetailsSlice';
import { ArticleDetailsSchema } from '../types/articleDetailsSchema';
import { Article } from '../types/article';

describe('articleDetailsSlice', () => {
    test('returns the initial state', () => {
        const state = articleDetailsReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({
            isLoading: false,
            error: undefined,
            data: undefined,
        });
    });

    test('sets isLoading and clears error on pending', () => {
        const initialState: DeepPartial<ArticleDetailsSchema> = { error: 'some error' };
        const state = articleDetailsReducer(
            initialState as ArticleDetailsSchema,
            fetchArticleById.pending('requestId', '1'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('stores the article and clears loading on fulfilled', () => {
        const article = { id: '1', title: 'Title' } as Article;
        const initialState: DeepPartial<ArticleDetailsSchema> = { isLoading: true };
        const state = articleDetailsReducer(
            initialState as ArticleDetailsSchema,
            fetchArticleById.fulfilled(article, 'requestId', '1'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(article);
    });

    test('stores the error and clears loading on rejected', () => {
        const initialState: DeepPartial<ArticleDetailsSchema> = { isLoading: true };
        const state = articleDetailsReducer(
            initialState as ArticleDetailsSchema,
            fetchArticleById.rejected(new Error('fail'), 'requestId', '1', 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });
});
