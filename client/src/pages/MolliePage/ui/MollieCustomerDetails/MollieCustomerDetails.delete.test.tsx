import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
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

const customer = { id: 'cst_1', givenName: 'Ivan', familyName: 'Petrov', clientLinks: [] };

interface Dependencies {
    mandates?: { id: string; status: string }[];
    subscriptions?: { id: string; status: string }[];
}

function mockCustomerData({ mandates = [], subscriptions = [] }: Dependencies = {}) {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/mollie/customers/cst_1') return Promise.resolve({ data: customer });
        if (url === '/mollie/mandates/cst_1') return Promise.resolve({ data: mandates });
        if (url === '/mollie/customers/cst_1/subscriptions') return Promise.resolve({ data: subscriptions });
        return Promise.resolve({ data: [] });
    });
}

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/mollie/customers/cst_1']}>
                <Routes>
                    <Route path="/mollie/customers" element={<div>customers list</div>} />
                    <Route path="/mollie/customers/:id" element={<MollieCustomerDetails />} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

async function findEnabledDeleteButton() {
    const button = await screen.findByRole('button', { name: 'Удалить' });
    await waitFor(() => expect(button).toBeEnabled());
    return button;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockCustomerData();
});

test('asks for confirmation in a modal before deleting the customer', async () => {
    renderPage();

    fireEvent.click(await findEnabledDeleteButton());

    expect(await screen.findByText('Удалить клиента Mollie?')).toBeInTheDocument();
    expect($apiPrivate.delete).not.toHaveBeenCalled();
});

test('keeps the customer when the confirmation is dismissed', async () => {
    renderPage();
    fireEvent.click(await findEnabledDeleteButton());
    await screen.findByText('Удалить клиента Mollie?');

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    await waitFor(() => expect(screen.queryByText('Удалить клиента Mollie?')).not.toBeInTheDocument());
    expect($apiPrivate.delete).not.toHaveBeenCalled();
});

test('deletes the customer after confirmation and returns to the customers list', async () => {
    ($apiPrivate.delete as jest.Mock).mockResolvedValue({ data: customer });
    renderPage();
    fireEvent.click(await findEnabledDeleteButton());
    await screen.findByText('Удалить клиента Mollie?');

    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }));

    expect(await screen.findByText('customers list')).toBeInTheDocument();
    expect($apiPrivate.delete).toHaveBeenCalledWith('/mollie/customers/cst_1');
    expect(toast.success).toHaveBeenCalledWith('Клиент Mollie удалён');
});

test('blocks deletion while the customer has a valid mandate', async () => {
    mockCustomerData({ mandates: [{ id: 'mdt_1', status: 'valid' }] });
    renderPage();

    expect(await screen.findByText(
        'Удаление недоступно: у клиента есть действующие мандаты или подписки.',
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled();
});

test('blocks deletion while the customer has an active subscription', async () => {
    mockCustomerData({ subscriptions: [{ id: 'sub_1', status: 'active' }] });
    renderPage();

    expect(await screen.findByText(
        'Удаление недоступно: у клиента есть действующие мандаты или подписки.',
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled();
});

test('allows deletion when mandates and subscriptions are no longer active', async () => {
    mockCustomerData({
        mandates: [{ id: 'mdt_1', status: 'invalid' }],
        subscriptions: [{ id: 'sub_1', status: 'canceled' }],
    });
    renderPage();

    expect(await findEnabledDeleteButton()).toBeEnabled();
});

test('stays on the page and reports the server refusal', async () => {
    ($apiPrivate.delete as jest.Mock).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    renderPage();
    fireEvent.click(await findEnabledDeleteButton());
    await screen.findByText('Удалить клиента Mollie?');

    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
        'Нельзя удалить: у клиента есть действующие мандаты или подписки',
    ));
    expect(screen.queryByText('customers list')).not.toBeInTheDocument();
});
