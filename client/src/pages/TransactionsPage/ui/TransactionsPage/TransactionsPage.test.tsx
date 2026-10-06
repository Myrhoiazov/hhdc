import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import TransactionsPage from './TransactionsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const transactions = [
    {
        id: '1', description: 'Аренда', amount: 100, currency: 'EUR', date: '2026-01-01', source: 'MANUAL', paymentMethod: 'CARD', type: 'EXPENSE',
    },
];
const summary = { income: 0, expense: 100 };

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string, config?: { params?: { _page?: number } }) => {
        if (url === '/transactions') {
            return Promise.resolve({
                data: {
                    items: transactions, total: 21, page: config?.params?._page ?? 1, limit: 20, totalPages: 2,
                },
            });
        }
        if (url === '/transactions/summary') return Promise.resolve({ data: summary });
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <TransactionsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('TransactionsPage', () => {
    test('fetches and renders the transaction list', async () => {
        renderPage();

        expect(await screen.findByText('Аренда')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/transactions', expect.objectContaining({
            params: expect.objectContaining({ _q: '' }),
        }));
        expect($apiPrivate.get).toHaveBeenCalledWith('/transactions/summary', expect.anything());
    });

    test('renders the search filter', async () => {
        renderPage();

        expect(await screen.findByPlaceholderText('Поиск')).toBeInTheDocument();
    });

    test('requests the next page and limit of 20 when the next-page button is clicked', async () => {
        renderPage();

        await screen.findByText('Аренда');

        fireEvent.click(screen.getAllByRole('button', { name: '→' })[0]);

        await waitFor(() => {
            expect($apiPrivate.get).toHaveBeenCalledWith('/transactions', expect.objectContaining({
                params: expect.objectContaining({ _page: 2, _limit: 20 }),
            }));
        });
    });

    test('renders the pagination controls both above and below the transaction list', async () => {
        renderPage();

        await screen.findByText('Аренда');

        expect(screen.getAllByRole('button', { name: '→' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: '←' })).toHaveLength(2);
    });
});
