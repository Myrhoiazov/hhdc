import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { MollieCustomerDetails } from './MollieCustomerDetails';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn(), post: jest.fn(), delete: jest.fn(), put: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const customer = {
    id: 'cst_1',
    givenName: 'Ivan',
    familyName: 'Petrov',
    clientLinks: [],
};

const clients = [{ id: '5', firstName: 'Petr', lastName: 'Sidorov', email: 'petr@example.com' }];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/customers/cst_1') return Promise.resolve({ data: customer });
        if (url === '/mollie/mandates/cst_1') return Promise.resolve({ data: [] });
        if (url === '/mollie/customers/cst_1/subscriptions') return Promise.resolve({ data: [] });
        if (url === '/mollie/customers/cst_1/payments') return Promise.resolve({ data: [] });
        if (url === '/mollie/customers/cst_1/student-links') return Promise.resolve({ data: [] });
        if (url === '/clients') return Promise.resolve({ data: clients });
        return Promise.resolve({ data: [] });
    });
});

function renderPage(id = 'cst_1') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/mollie/customers/${id}`]}>
                <Routes>
                    <Route path="/mollie/customers/:id" element={<MollieCustomerDetails />} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

describe('MollieCustomerDetails', () => {
    test('fetches and renders the mollie client, mandates and subscriptions', async () => {
        renderPage();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/mandates/cst_1');
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/cst_1/subscriptions');
    });

    test('renders the student links manager and lists an available client', async () => {
        renderPage();

        expect(await screen.findByText('Пока нет связанных учеников.')).toBeInTheDocument();
        expect(screen.getByText('Ученики этого плательщика')).toBeInTheDocument();
    });

    test('links a student to the payment profile', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { ...customer, clientLinks: [{ id: 'l1', client: clients[0], payerRelation: 'parent' }] } });
        renderPage();
        await screen.findByText('Пока нет связанных учеников.');

        fireEvent.click(screen.getByRole('button', { name: 'Привязать' }));

        expect(await screen.findByText('Выберите ученика')).toBeInTheDocument();
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('opens the edit modal and loads the client data', async () => {
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/cst_1'));
    });

    test('renders the empty payment history state', async () => {
        renderPage();

        expect(await screen.findByText('Платежи пока не найдены.')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith(
            '/mollie/customers/cst_1/payments',
            expect.anything(),
        );
    });

    test('fetches student links from the dedicated endpoint, not the full customer payload', async () => {
        renderPage();

        await screen.findByText('Пока нет связанных учеников.');
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/cst_1/student-links');
    });

    test('loads the heavy customer endpoint only once per page view', async () => {
        renderPage();

        await screen.findByText('Ivan Petrov');
        await screen.findByText('Платежи пока не найдены.');

        const heavyCalls = ($apiPrivate.get as jest.Mock).mock.calls
            .filter(([url]) => url === '/mollie/customers/cst_1');
        expect(heavyCalls).toHaveLength(1);
    });
});
