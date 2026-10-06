import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import { ArticleType, ArticleBlockType } from '@/entities/Article/model/types/article';
import ArticleDetailsPage from './ArticleDetailsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn(), post: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const article = {
    id: '1',
    title: 'My article',
    subtitle: 'Sub',
    img: '/img.png',
    views: 5,
    createdAt: '2026-01-15',
    type: [ArticleType.IT],
    user: { id: '1', username: 'denis', email: 'd@example.com', role: 'ADMIN' },
    blocks: [{ id: '1', type: ArticleBlockType.TEXT, paragraphs: ['Text'] }],
};

beforeEach(() => {
    jest.clearAllMocks();
    ($api.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/articles/1') return Promise.resolve({ data: article });
        if (url === '/comments') return Promise.resolve({ data: [] });
        return Promise.resolve({ data: [] });
    });
});

function renderPage(id = '1') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/articles/${id}`]}>
                <Routes>
                    <Route path="/articles/:id" element={<ArticleDetailsPage />} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

describe('ArticleDetailsPage', () => {
    test('renders the article and fetches its comments', async () => {
        renderPage();
        expect(await screen.findByText('My article')).toBeInTheDocument();
        expect($api.get).toHaveBeenCalledWith('/comments', { params: { articleId: '1', _expand: 'user' } });
    });

    test('renders the comments empty state', async () => {
        renderPage();
        expect(await screen.findByText('Комментарии отсутствуют')).toBeInTheDocument();
    });

    test('renders the given comments', async () => {
        ($api.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/articles/1') return Promise.resolve({ data: article });
            if (url === '/comments') return Promise.resolve({ data: [{ id: 'c1', text: 'Nice!', author: { id: '2', firstName: 'Ivan' } }] });
            return Promise.resolve({ data: [] });
        });
        renderPage();

        expect(await screen.findByText('Nice!')).toBeInTheDocument();
    });

    test('the back button is present', async () => {
        renderPage();
        await screen.findByText('My article');
        expect(screen.getByRole('button', { name: 'Назад к списку' })).toBeInTheDocument();
    });
});
