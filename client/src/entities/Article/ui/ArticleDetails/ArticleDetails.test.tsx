import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import { ArticleDetails } from './ArticleDetails';
import { ArticleBlockType, ArticleType } from '../../model/types/article';
import { RoleKey } from '@/entities/Role';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderArticleDetails(id = '1') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ArticleDetails id={id} />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ArticleDetails', () => {
    test('renders the article title and blocks once loaded', async () => {
        ($api.get as jest.Mock).mockResolvedValue({
            data: {
                id: '1',
                title: 'My article',
                subtitle: 'Sub',
                img: '/img.png',
                views: 5,
                createdAt: '2026-01-15',
                type: [ArticleType.IT],
                user: { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN },
                blocks: [{ id: '1', type: ArticleBlockType.TEXT, paragraphs: ['Hello'] }],
            },
        });

        renderArticleDetails('1');

        expect(await screen.findByText('My article')).toBeInTheDocument();
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect($api.get).toHaveBeenCalledWith('/articles/1');
    });

    test('shows an error message when loading fails', async () => {
        ($api.get as jest.Mock).mockRejectedValue(new Error('network error'));

        renderArticleDetails('1');

        expect(await screen.findByText('Произошла ошибка при загрузке статьи.')).toBeInTheDocument();
    });
});
