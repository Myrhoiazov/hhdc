import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import ClientsPage from './ClientsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn().mockImplementation((url: string) => {
            if (url === '/schedule/groups') return Promise.resolve({ data: { data: [] } });
            if (url === '/mollie/customers') return Promise.resolve({ data: { items: [] } });
            return Promise.resolve({ data: [] });
        }),
        post: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('@/features/editClientDropdown', () => ({
    EditClientDropdown: () => <div>dropdown</div>,
}));

const clients = [
    {
        id: '1', firstName: 'Ivan', lastName: 'Petrov', branch: { name: 'Center' }, mollieLinks: [{ customerId: 'c1' }],
    },
    { id: '2', firstName: 'Petr', lastName: 'Sidorov', branch: { name: 'Center' }, mollieLinks: [] },
];

beforeEach(() => {
    jest.clearAllMocks();
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ClientsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('ClientsPage', () => {
    test('fetches and renders the client list with computed stats', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/clients') return Promise.resolve({ data: clients });
            if (url === '/schedule/groups') return Promise.resolve({ data: { data: [] } });
            if (url === '/mollie/customers') return Promise.resolve({ data: { items: [] } });
            return Promise.resolve({ data: [] });
        });

        renderPage();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/clients', expect.objectContaining({
            params: expect.objectContaining({ _q: '' }),
        }));
    });

    test('renders the filters and view selector', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/clients') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });

        renderPage();

        expect(await screen.findByPlaceholderText('Поиск')).toBeInTheDocument();
        expect(screen.getByText('Оплата')).toBeInTheDocument();
    });
});
