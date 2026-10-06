import { fireEvent, render, screen } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { PaymentLinkModal, PaymentLinkPayer } from './PaymentLinkModal';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const payers: PaymentLinkPayer[] = [{ id: 1, name: 'Ivan Petrov', email: 'ivan@example.com' }];

Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });

beforeEach(() => {
    jest.clearAllMocks();
});

function renderModal(props: Partial<React.ComponentProps<typeof PaymentLinkModal>> = {}) {
    return render(
        <PaymentLinkModal
            clientId="1"
            payers={payers}
            isOpen
            onClose={jest.fn()}
            onCreated={jest.fn()}
            {...props}
        />,
    );
}

describe('PaymentLinkModal', () => {
    test('shows a message when there are no linked payers', () => {
        renderModal({ payers: [] });

        expect(screen.getByText('Нет связанного плательщика')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Создать ссылку' })).toBeDisabled();
    });

    test('creates a payment link and shows the checkout url', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { checkoutUrl: 'https://mollie.test/pay/1', paymentId: 'p1', status: 'open' } });
        const onCreated = jest.fn();
        renderModal({ onCreated });

        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });

        fireEvent.click(screen.getByRole('button', { name: 'Создать ссылку' }));

        expect(await screen.findByText('https://mollie.test/pay/1')).toBeInTheDocument();
        expect($apiPrivate.post).toHaveBeenCalledWith('/mollie/customers/1/payment-link', {
            clientId: 1,
            amountValue: 25,
            description: 'Оплата занятий',
        });
        expect(onCreated).toHaveBeenCalledTimes(1);
    });

    test('does not create a link when the amount is invalid', () => {
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Создать ссылку' }));

        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('copies the checkout url once created', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { checkoutUrl: 'https://mollie.test/pay/1', paymentId: 'p1', status: 'open' } });
        renderModal();

        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
        fireEvent.click(screen.getByRole('button', { name: 'Создать ссылку' }));
        await screen.findByText('https://mollie.test/pay/1');

        fireEvent.click(screen.getByRole('button', { name: 'Скопировать' }));

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://mollie.test/pay/1');
    });
});
