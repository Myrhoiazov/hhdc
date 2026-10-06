import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import ClientsDetailsPage from './ClientsDetailsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const client = {
    id: '1', firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com',
};
const paymentSummary = {
    payers: [], latestPayments: [], paymentLinks: [], subscriptions: [], activeSubscriptions: [], mandates: [],
    summary: { payerCount: 0, activeSubscriptionCount: 0, paymentStatus: 'unknown' as const },
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/clients/1') return Promise.resolve({ data: client });
        if (url === '/clients/1/payment-summary') return Promise.resolve({ data: paymentSummary });
        if (url === '/comments') return Promise.resolve({ data: [] });
        if (url === '/company/branches') return Promise.resolve({ data: [] });
        if (url === '/schedule/groups') return Promise.resolve({ data: { data: [] } });
        return Promise.resolve({ data: [] });
    });
});

function renderPage(id = '1') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/clients/${id}`]}>
                <Routes>
                    <Route path="/clients/:id" element={<ClientsDetailsPage />} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

describe('ClientsDetailsPage', () => {
    test('renders the header and fetches the client details', async () => {
        renderPage();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Назад к списку' })).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/clients/1');
        expect($apiPrivate.get).toHaveBeenCalledWith('/clients/1/payment-summary');
    });

    test('opens the edit modal when the edit button is clicked', async () => {
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));

        expect(await screen.findByText('Редактирование ученика')).toBeInTheDocument();
    });
});
