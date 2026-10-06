import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { MollieCustomers } from './MollieCustomers';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const clientsPage = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
    data: {
        items, total: items.length, page: 1, limit: 15, totalPages: 1, ...overrides,
    },
});

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/customers') return Promise.resolve(clientsPage([{ id: '1', givenName: 'Ivan', familyName: 'Petrov' }]));
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <MollieCustomers />
            </MemoryRouter>
        </Provider>,
    );
}

describe('MollieCustomers', () => {
    test('fetches and renders the mollie client list', async () => {
        renderPage();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', expect.objectContaining({
            params: expect.objectContaining({ _page: 1, _limit: 15 }),
        }));
    });

    test('applying filters refetches with the search query', async () => {
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.change(screen.getByPlaceholderText('Имя, email или Mollie ID'), { target: { value: 'ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', expect.objectContaining({
            params: expect.objectContaining({ _q: 'ivan', _page: 1 }),
        })));
    });

    test('resetting filters clears the search and refetches', async () => {
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.change(screen.getByPlaceholderText('Имя, email или Mollie ID'), { target: { value: 'ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));

        expect(screen.getByPlaceholderText('Имя, email или Mollie ID')).toHaveValue('');
        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', expect.objectContaining({
            params: expect.objectContaining({ _q: undefined }),
        })));
    });

    test('paginates to the next page', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/customers') {
                return Promise.resolve(clientsPage([{ id: '1', givenName: 'Ivan', familyName: 'Petrov' }], { total: 30, totalPages: 2 }));
            }
            return Promise.resolve({ data: [] });
        });
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getAllByRole('button', { name: '→' })[0]);

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', expect.objectContaining({
            params: expect.objectContaining({ _page: 2 }),
        })));
    });

    test('exports active subscriptions as csv', async () => {
        const blob = new Blob(['csv']);
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/mollie/customers') return Promise.resolve(clientsPage([{ id: '1', givenName: 'Ivan', familyName: 'Petrov' }]));
            if (url === '/mollie/customers/active-subscriptions/export.csv') return Promise.resolve({ data: blob });
            return Promise.resolve({ data: [] });
        });
        URL.createObjectURL = jest.fn(() => 'blob:url');
        URL.revokeObjectURL = jest.fn();
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'CSV активные подписки' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/active-subscriptions/export.csv', expect.objectContaining({
            responseType: 'blob',
        })));
    });
});
