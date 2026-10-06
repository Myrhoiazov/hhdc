import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import HomePage from './HomePage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const summary = {
    totalCustomers: 10,
    activeSubscriptions: 4,
    validMandates: 5,
    paidThisMonth: 3,
    failedPayments: 1,
    monthlyRevenue: 1500,
    currency: 'EUR',
    latestFailedPayments: [
        { id: 1, status: 'failed', amountValue: 25, amountCurrency: 'EUR', updatedAt: '2026-01-15T10:00:00.000Z', customer: { id: 1, givenName: 'Ivan', familyName: 'Petrov' } },
    ],
};

const chartData = {
    period: 'week' as const,
    updatedAt: '2026-01-15T10:00:00.000Z',
    incomeTotal: 1000,
    expenseTotal: 200,
    balance: 800,
    items: [{ key: 'mon', label: 'Mon', income: 100, expense: 20 }],
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/dashboard/summary') return Promise.resolve({ data: summary });
        if (url === '/transactions/chart') return Promise.resolve({ data: chartData });
        return Promise.resolve({ data: {} });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('HomePage', () => {
    test('renders the KPI cards once the summary has loaded', async () => {
        renderPage();
        expect(await screen.findByText('€ 1.500,00')).toBeInTheDocument();
    });

    test('renders the failed payment with customer name', async () => {
        renderPage();
        expect(await screen.findByText('Ivan Petrov · failed')).toBeInTheDocument();
    });

    test('shows an error message when the summary fails to load', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/dashboard/summary') return Promise.reject(new Error('network error'));
            return Promise.resolve({ data: chartData });
        });
        renderPage();

        expect(await screen.findByText('Не удалось загрузить Mollie summary')).toBeInTheDocument();
    });

    test('triggers a Mollie sync and shows the result summary', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                customers: { created: 1, updated: 0, skipped: 0, errors: 0 },
                mandates: { created: 0, updated: 1, skipped: 0, errors: 0 },
                subscriptions: { created: 0, updated: 0, skipped: 0, errors: 0 },
                payments: { created: 0, updated: 0, skipped: 0, errors: 0 },
            },
        });
        renderPage();
        await screen.findByText('€ 1.500,00');

        fireEvent.click(screen.getByRole('button', { name: 'Sync Mollie' }));

        await waitFor(() => {
            expect(screen.getByText('Sync: создано 1, обновлено 1, пропущено 0, ошибок 0')).toBeInTheDocument();
        });
        expect($apiPrivate.post).toHaveBeenCalledWith('/mollie/sync');
    });

    test('switches the chart period when a period tab is clicked', async () => {
        renderPage();
        await screen.findByText('€ 1.500,00');

        fireEvent.click(screen.getByText('Месяц'));

        await waitFor(() => {
            expect($apiPrivate.get).toHaveBeenCalledWith('/transactions/chart', { params: { period: 'month' } });
        });
    });
});
