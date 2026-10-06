import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { MollieIncidents } from './MollieIncidents';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const incidentsPage = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
    data: {
        items,
        totals: {
            total: items.length, payments: items.length, subscriptions: 0, customers: 0,
        },
        total: items.length,
        page: 1,
        limit: 25,
        totalPages: 1,
        ...overrides,
    },
});

const incident = {
    id: 'inc_1',
    type: 'payment' as const,
    severity: 'critical' as const,
    title: 'Payment failed',
    status: 'failed',
    amountValue: '10.00',
    amountCurrency: 'EUR',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    customer: { id: 5, payerName: 'Ivan Petrov' },
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/incidents') return Promise.resolve(incidentsPage([incident]));
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    return render(<MemoryRouter><MollieIncidents /></MemoryRouter>);
}

describe('MollieIncidents', () => {
    test('fetches and renders the incident list with summary totals', async () => {
        renderPage();

        expect(await screen.findByText('Payment failed')).toBeInTheDocument();
        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/incidents', expect.objectContaining({
            params: expect.objectContaining({ _page: 1, _limit: 25 }),
        }));
    });

    test('shows the empty state when there are no incidents', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/incidents') return Promise.resolve(incidentsPage([]));
            return Promise.resolve({ data: [] });
        });

        renderPage();

        expect(await screen.findByText('Проблем нет')).toBeInTheDocument();
    });

    test('shows an error state when the request fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        renderPage();

        expect(await screen.findByText('Не удалось загрузить проблемы')).toBeInTheDocument();
    });

    test('applying the type filter refetches with the filter', async () => {
        renderPage();
        await screen.findByText('Payment failed');

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[selects.length - 1], { target: { value: 'subscriptions' } });
        fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/incidents', expect.objectContaining({
            params: expect.objectContaining({ type: 'subscriptions' }),
        })));
    });

    test('resolving an incident asks for confirmation and posts the resolve action', async () => {
        window.confirm = jest.fn(() => true);
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: {} });
        renderPage();
        await screen.findByText('Payment failed');

        fireEvent.click(screen.getByRole('button', { name: 'Пометить решённым' }));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/mollie/incidents/inc_1/resolve'));
    });

    test('does not resolve when the confirmation is declined', async () => {
        window.confirm = jest.fn(() => false);
        renderPage();
        await screen.findByText('Payment failed');

        fireEvent.click(screen.getByRole('button', { name: 'Пометить решённым' }));

        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('syncing payments posts to the sync endpoint and shows the result message', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                created: 1, updated: 0, skipped: 0, errors: 0,
            },
        });
        renderPage();
        await screen.findByText('Payment failed');

        fireEvent.click(screen.getByRole('button', { name: 'Sync payments' }));

        expect(await screen.findByText('Sync payments: создано 1, обновлено 0, пропущено 0, ошибок 0')).toBeInTheDocument();
    });
});
