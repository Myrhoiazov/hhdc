import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { MolliePayments } from './MolliePayments';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const paymentsPage = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
    data: {
        items, total: items.length, page: 1, limit: 25, totalPages: 1, ...overrides,
    },
});

const payment = {
    id: 1,
    mollieId: 'tr_1',
    amountValue: '10.00',
    amountCurrency: 'EUR',
    description: 'Занятие',
    method: 'ideal',
    status: 'paid',
    createdAt: '2026-01-01T00:00:00Z',
    customer: { id: 5, payerName: 'Ivan Petrov', email: 'ivan@example.com' },
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/payments') return Promise.resolve(paymentsPage([payment]));
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    return render(<MemoryRouter><MolliePayments /></MemoryRouter>);
}

describe('MolliePayments', () => {
    test('fetches and renders the payments table', async () => {
        renderPage();

        expect(await screen.findByText('Занятие')).toBeInTheDocument();
        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/payments', expect.objectContaining({
            params: expect.objectContaining({ _page: 1, _limit: 25 }),
        }));
    });

    test('shows the empty state when there are no payments', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/payments') return Promise.resolve(paymentsPage([]));
            return Promise.resolve({ data: [] });
        });

        renderPage();

        expect(await screen.findByText('Платежи не найдены')).toBeInTheDocument();
    });

    test('shows an error state when the request fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        renderPage();

        expect(await screen.findByText('Не удалось загрузить платежи')).toBeInTheDocument();
    });

    test('applying filters refetches with the search query', async () => {
        renderPage();
        await screen.findByText('Занятие');

        fireEvent.change(screen.getByPlaceholderText('ID, описание, клиент, email'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/payments', expect.objectContaining({
            params: expect.objectContaining({ _q: 'Ivan' }),
        })));
    });

    test('toggling "Проблемные" filters to issue-only payments', async () => {
        renderPage();
        await screen.findByText('Занятие');

        fireEvent.click(screen.getByRole('button', { name: 'Проблемные' }));
        fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/payments', expect.objectContaining({
            params: expect.objectContaining({ issueOnly: true }),
        })));
    });

    test('syncing payments posts to the sync endpoint and shows the result message', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                created: 2, updated: 1, skipped: 0, errors: 0,
            },
        });
        renderPage();
        await screen.findByText('Занятие');

        fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

        expect(await screen.findByText('Sync payments: создано 2, обновлено 1, пропущено 0, ошибок 0')).toBeInTheDocument();
        expect($apiPrivate.post).toHaveBeenCalledWith('/mollie/sync/payments');
    });

    test('exports payments as csv', async () => {
        const blob = new Blob(['csv']);
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/payments') return Promise.resolve(paymentsPage([payment]));
            if (url === '/mollie/payments/export.csv') return Promise.resolve({ data: blob });
            return Promise.resolve({ data: [] });
        });
        URL.createObjectURL = jest.fn(() => 'blob:url');
        URL.revokeObjectURL = jest.fn();
        renderPage();
        await screen.findByText('Занятие');

        fireEvent.click(screen.getByRole('button', { name: 'Платежи CSV' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/payments/export.csv', expect.objectContaining({
            responseType: 'blob',
        })));
    });
});
