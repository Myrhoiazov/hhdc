import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import InvoicesPage from './InvoicesPage';
import { Invoice } from '../../model/types';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const draftInvoice: Invoice = {
    id: 1,
    number: 'INV-1',
    documentType: 'INVOICE',
    status: 'DRAFT',
    billToName: 'Ivan Petrov',
    issueDate: '2026-01-01',
    currency: 'EUR',
    totalCents: 10000,
    paidAmountCents: 0,
    creditedAmountCents: 0,
    balanceDueCents: 10000,
    issuerName: 'Talent Center DDC',
    showPaymentButton: true,
    showPaymentQr: true,
    items: [{
        id: 1, description: 'Занятие', quantity: 1, unitPriceCents: 10000, totalCents: 10000,
    }],
    payments: [],
    molliePayments: [],
    molliePaymentLinks: [],
    deliveries: [],
    auditLogs: [],
    adjustments: [],
};

const listResponse = (items: Invoice[]) => ({
    data: {
        items, total: items.length, page: 1, totalPages: 1,
    },
});

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/invoices') return Promise.resolve(listResponse([draftInvoice]));
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <InvoicesPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('InvoicesPage', () => {
    test('fetches and renders the invoice list', async () => {
        renderPage();

        expect(await screen.findByText('INV-1')).toBeInTheDocument();
        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/invoices', {
            params: { status: 'ALL', _q: undefined, _page: 1, _limit: 15 },
        });
    });

    test('shows the empty state when there are no invoices', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/invoices') return Promise.resolve(listResponse([]));
            return Promise.resolve({ data: [] });
        });

        renderPage();

        expect(await screen.findByText('Инвойсов пока нет')).toBeInTheDocument();
    });

    test('filtering by status refetches with the new filter', async () => {
        renderPage();
        await screen.findByText('INV-1');

        fireEvent.click(screen.getByRole('button', { name: 'Оплачен' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/invoices', expect.objectContaining({
            params: expect.objectContaining({ status: 'PAID' }),
        })));
    });

    test('searching applies the query and refetches', async () => {
        renderPage();
        await screen.findByText('INV-1');

        fireEvent.change(screen.getByLabelText('Поиск инвойсов'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Найти' }));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalledWith('/invoices', expect.objectContaining({
            params: expect.objectContaining({ _q: 'Ivan' }),
        })));
    });

    test('issuing a draft invoice patches its status and refetches', async () => {
        ($apiPrivate.patch as jest.Mock).mockResolvedValue({ data: {} });
        renderPage();
        await screen.findByText('INV-1');

        fireEvent.click(screen.getByRole('button', { name: 'Выдать' }));

        await waitFor(() => expect($apiPrivate.patch).toHaveBeenCalledWith('/invoices/1/status', { status: 'ISSUED' }));
    });

    test('recording a payment through the action modal posts the payment', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/invoices') return Promise.resolve(listResponse([{ ...draftInvoice, status: 'ISSUED' }]));
            return Promise.resolve({ data: [] });
        });
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: {} });
        renderPage();
        await screen.findByText('INV-1');

        fireEvent.click(screen.getByRole('button', { name: 'Добавить оплату' }));
        fireEvent.change(await screen.findByLabelText('Сумма, EUR'), { target: { value: '100' } });
        fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать' }));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith(
            '/invoices/1/payments',
            expect.objectContaining({ amountCents: 10000 }),
        ));
    });

    test('opens the create-invoice modal', async () => {
        renderPage();
        await screen.findByText('INV-1');

        fireEvent.click(screen.getByRole('button', { name: '+ Создать инвойс' }));

        expect(await screen.findByText('НОВЫЙ ИНВОЙС')).toBeInTheDocument();
    });
});
