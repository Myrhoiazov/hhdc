import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { MolliePaymentsMatrix } from './MolliePaymentsMatrix';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const matrixResponse = {
    startYear: 2025,
    endYear: 2026,
    months: [
        {
            key: '2025-09', label: 'Сен', year: 2025, month: 9,
        },
        {
            key: '2025-10', label: 'Окт', year: 2025, month: 10,
        },
    ],
    rows: [
        {
            key: 'row-1',
            clientId: 1,
            customerId: null,
            name: 'Ivan Petrov',
            payerNames: ['Sergey Petrov'],
            branch: 'Center',
            cells: {
                '2025-09': {
                    paid: true, paidCount: 1, issueCount: 0, amount: 50, currency: 'EUR',
                },
                '2025-10': {
                    paid: false, paidCount: 0, issueCount: 0, amount: 0, currency: 'EUR',
                },
            },
            paidMonths: 1,
        },
    ],
};

const upcomingResponse = {
    items: [
        {
            id: 1,
            description: 'Ballet subscription',
            amountValue: '25.00',
            amountCurrency: 'EUR',
            interval: '1 month',
            nextPaymentDate: '2026-01-15',
            mandate: { status: 'valid', method: 'directdebit' },
            customer: {
                id: 7, payerName: 'Maria Ivanova', client: { id: 2, firstName: 'Petr', lastName: 'Sidorov' },
            },
        },
    ],
    total: 1,
    amount: 25,
    currency: 'EUR',
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/payments/matrix') return Promise.resolve({ data: matrixResponse });
        if (url === '/mollie/subscriptions/upcoming') return Promise.resolve({ data: upcomingResponse });
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    return render(<MemoryRouter><MolliePaymentsMatrix /></MemoryRouter>);
}

describe('MolliePaymentsMatrix', () => {
    test('fetches and renders the matrix rows and months', async () => {
        renderPage();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByText('Сен')).toBeInTheDocument();
        expect(screen.getByText('Окт')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/payments/matrix', expect.objectContaining({
            params: expect.objectContaining({ startYear: expect.any(String) }),
        }));
    });

    test('renders the upcoming subscriptions list', async () => {
        renderPage();

        expect(await screen.findByText('Ballet subscription')).toBeInTheDocument();
    });

    test('shows an error state when the matrix request fails', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/payments/matrix') return Promise.reject(new Error('network error'));
            if (url === '/mollie/subscriptions/upcoming') return Promise.resolve({ data: upcomingResponse });
            return Promise.resolve({ data: [] });
        });

        renderPage();

        expect(await screen.findByText('Не удалось загрузить матрицу')).toBeInTheDocument();
    });

    test('filters rows by the search input', async () => {
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.change(screen.getByPlaceholderText('Ученик, плательщик или филиал'), { target: { value: 'no-match' } });

        expect(screen.queryByText('Ivan Petrov')).not.toBeInTheDocument();
        expect(await screen.findByText('По выбранному фильтру ничего не найдено.')).toBeInTheDocument();
    });

    test('syncing reloads the matrix and shows a success toast', async () => {
        const { toast } = jest.requireMock('react-toastify');
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: {} });
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'Sync payments' }));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/mollie/sync/payments'));
        expect($apiPrivate.post).toHaveBeenCalledWith('/mollie/sync/subscriptions');
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Матрица платежей обновлена'));
    });
});
