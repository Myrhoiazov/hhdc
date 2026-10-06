import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { ClientPaymentBlock } from './ClientPaymentBlock';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const summary = {
    payers: [{
        id: 1, customer: { id: 100, mollieId: 'cst_1', payerName: 'Ivan Petrov', email: 'ivan@example.com' }, payerRelation: 'self', linkSource: 'manual', isPrimary: true,
    }],
    latestPayments: [{
        id: 1, amountValue: '10.00', amountCurrency: 'EUR', status: 'paid', createdAt: '2026-01-01', updatedAt: '2026-01-01', customer: { id: 100, payerName: 'Ivan Petrov' },
    }],
    paymentLinks: [],
    subscriptions: [],
    activeSubscriptions: [],
    mandates: [],
    summary: {
        payerCount: 1, activeSubscriptionCount: 0, paymentStatus: 'active' as const, lastPayment: null, latestIssue: null,
    },
};

beforeEach(() => {
    jest.clearAllMocks();
});

function renderBlock() {
    return render(
        <MemoryRouter>
            <ClientPaymentBlock id="1" />
        </MemoryRouter>,
    );
}

describe('ClientPaymentBlock', () => {
    test('shows a skeleton while loading', () => {
        ($apiPrivate.get as jest.Mock).mockReturnValue(new Promise(() => {}));

        const { container } = renderBlock();

        expect(container.querySelector('.Skeleton')).toBeInTheDocument();
    });

    test('shows an error state when the summary fails to load', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        renderBlock();

        expect(await screen.findByText('Не удалось загрузить платежный блок.')).toBeInTheDocument();
    });

    test('renders payers and latest payments once loaded', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: summary });

        renderBlock();

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/clients/1/payment-summary');
        expect(screen.getByText('Активно')).toBeInTheDocument();
    });

    test('creates a payment link through the payment link modal', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: summary });

        renderBlock();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'Payment link' }));

        expect(await screen.findByText('Отправить payment link')).toBeInTheDocument();
    });

    test('opens the create mandate modal', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: summary });

        renderBlock();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByRole('button', { name: 'Создать mandate' }));

        expect(await screen.findByText('Mandate разрешает регулярные списания с IBAN плательщика.')).toBeInTheDocument();
    });
});
