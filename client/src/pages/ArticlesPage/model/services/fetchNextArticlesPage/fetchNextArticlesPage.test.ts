import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchNextArticlesPage } from './fetchNextArticlesPage';
import { fetchArticlesList } from '../fetchArticlesList/fetchArticlesList';
import { articlesPageActions } from '../../slices/ArticlesPageSlice';

jest.mock('../fetchArticlesList/fetchArticlesList');

const dispatch = jest.fn();
const extra = {};

describe('fetchNextArticlesPage', () => {
    test('advances the page and fetches the next batch when more articles are available', async () => {
        const state: StateSchema = fromPartial({ articlesPage: { page: 2, hasMore: true, isLoading: false } });

        await fetchNextArticlesPage()(dispatch, () => state, extra as never);

        expect(dispatch).toHaveBeenCalledWith(articlesPageActions.setPage(3));
        expect(fetchArticlesList).toHaveBeenCalledWith({ page: 3 });
    });

    test('does nothing when there are no more articles to load', async () => {
        const state: StateSchema = fromPartial({ articlesPage: { page: 2, hasMore: false, isLoading: false } });

        await fetchNextArticlesPage()(dispatch, () => state, extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(articlesPageActions.setPage(expect.anything()));
        expect(fetchArticlesList).not.toHaveBeenCalled();
    });

    test('does nothing while a page is already loading', async () => {
        const state: StateSchema = fromPartial({ articlesPage: { page: 2, hasMore: true, isLoading: true } });

        await fetchNextArticlesPage()(dispatch, () => state, extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(articlesPageActions.setPage(expect.anything()));
        expect(fetchArticlesList).not.toHaveBeenCalled();
    });
});
