import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { Invoice } from '../../model/types';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn(), post: jest.fn(), put: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const clients = [{ id: 1, firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com' }];
const groups = { data: [{ id: 10, name: 'Ballet', lessonPriceCents: 1500, branch: { id: 1, name: 'Center' } }] };
const brands: unknown[] = [];
const branches: unknown[] = [];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/clients') return Promise.resolve({ data: clients });
        if (url === '/schedule/groups') return Promise.resolve({ data: groups });
        if (url === '/company/brands') return Promise.resolve({ data: brands });
        if (url === '/company/branches') return Promise.resolve({ data: branches });
        return Promise.resolve({ data: [] });
    });
});

function renderModal(props: Partial<React.ComponentProps<typeof CreateInvoiceModal>> = {}) {
    return render(
        <CreateInvoiceModal
            isOpen
            onClose={jest.fn()}
            onSaved={jest.fn()}
            {...props}
        />,
    );
}

describe('CreateInvoiceModal', () => {
    test('loads clients and groups when opened', async () => {
        renderModal();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByText('Ballet')).toBeInTheDocument();
    });

    test('selecting a client fills the recipient name and email', async () => {
        renderModal();
        await screen.findByText('Ivan Petrov');

        fireEvent.change(screen.getByLabelText('Ученик'), { target: { value: '1' } });

        expect(screen.getByLabelText('Получатель *')).toHaveValue('Ivan Petrov');
        expect(screen.getByLabelText('Email получателя')).toHaveValue('ivan@example.com');
    });

    test('selecting a group fills description and price for that item', async () => {
        renderModal();
        await screen.findByText('Ballet');

        const groupSelects = screen.getAllByText('Вручную').map((option) => option.closest('select'));
        fireEvent.change(groupSelects[0]!, { target: { value: '10' } });

        expect(screen.getByDisplayValue('Dance classes — Ballet')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15.00')).toBeInTheDocument();
    });

    test('shows a validation error and does not submit without a recipient name', async () => {
        renderModal();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'Создать инвойс' }));

        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('creates a new invoice with the entered data', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: {} });
        const onSaved = jest.fn();
        const onClose = jest.fn();
        renderModal({ onSaved, onClose });
        await screen.findByText('Ivan Petrov');

        fireEvent.change(screen.getByLabelText('Получатель *'), { target: { value: 'Petr Sidorov' } });
        fireEvent.change(screen.getByPlaceholderText('Описание'), { target: { value: 'Занятие' } });
        fireEvent.click(screen.getByRole('button', { name: 'Создать инвойс' }));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/invoices', expect.objectContaining({
            billToName: 'Petr Sidorov',
        })));
        expect(onSaved).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('prefills the form fields when editing an existing invoice', async () => {
        const editInvoice: Invoice = {
            id: 5,
            number: 'INV-5',
            documentType: 'INVOICE',
            status: 'DRAFT',
            billToName: 'Existing Client',
            billToEmail: 'existing@example.com',
            issueDate: '2026-01-10',
            dueDate: '2026-01-20',
            currency: 'EUR',
            totalCents: 1500,
            paidAmountCents: 0,
            creditedAmountCents: 0,
            balanceDueCents: 1500,
            issuerName: 'Talent Center DDC',
            showPaymentButton: true,
            showPaymentQr: true,
            items: [{
                id: 1, description: 'Old item', quantity: 1, unitPriceCents: 1500, totalCents: 1500,
            }],
            payments: [],
            molliePayments: [],
            molliePaymentLinks: [],
            deliveries: [],
            auditLogs: [],
            adjustments: [],
        };

        renderModal({ editInvoice });

        expect(await screen.findByDisplayValue('Existing Client')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Old item')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Сохранить изменения' })).toBeInTheDocument();
    });
});
