import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import { ArticleType, ArticleBlockType } from '@/entities/Article/model/types/article';
import ArticlesPage from './ArticlesPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const article = {
    id: '1',
    title: 'My article',
    subtitle: '',
    img: '/img.png',
    views: 5,
    createdAt: '2026-01-15',
    type: [ArticleType.IT],
    user: { id: '1', username: 'denis', email: 'd@example.com', role: 'ADMIN' },
    blocks: [{ id: '1', type: ArticleBlockType.TEXT, paragraphs: ['Text'] }],
};

beforeEach(() => {
    jest.clearAllMocks();
    ($api.get as jest.Mock).mockResolvedValue({ data: [article] });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ArticlesPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('ArticlesPage', () => {
    test('renders the loaded articles', async () => {
        renderPage();
        expect(await screen.findByText('My article')).toBeInTheDocument();
        expect($api.get).toHaveBeenCalledWith('/articles', { params: { _expand: 'user', _limit: 9, _page: 1 } });
    });

    test('switches between the tile and list view', async () => {
        renderPage();
        await screen.findByText('My article');

        const viewButtons = screen.getAllByRole('button');
        fireEvent.click(viewButtons[1]);

        expect(await screen.findByRole('button', { name: 'Читать далее...' })).toBeInTheDocument();
    });
});
