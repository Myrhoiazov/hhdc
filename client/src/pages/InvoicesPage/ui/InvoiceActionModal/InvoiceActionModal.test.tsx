import { fireEvent, render, screen } from '@testing-library/react';
import { ActionResult, InvoiceAction, InvoiceActionModal } from './InvoiceActionModal';
import { Invoice } from '../../model/types';

const invoice: Invoice = {
    id: 1,
    number: 'INV-1',
    documentType: 'INVOICE',
    status: 'ISSUED',
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
    items: [],
    payments: [],
    molliePayments: [],
    molliePaymentLinks: [],
    deliveries: [],
    auditLogs: [],
    adjustments: [],
};

function renderModal(action: InvoiceAction | null, onConfirm = jest.fn(), onClose = jest.fn()) {
    return { onConfirm, onClose, ...render(<InvoiceActionModal action={action} onConfirm={onConfirm} onClose={onClose} />) };
}

describe('InvoiceActionModal', () => {
    test('renders nothing when there is no active action', () => {
        const { container } = renderModal(null);

        expect(container.querySelector('form')).not.toBeInTheDocument();
    });

    test('record-payment: submits the entered amount and method', () => {
        const { onConfirm } = renderModal({ type: 'record-payment', invoice });

        fireEvent.change(screen.getByLabelText('Сумма, EUR'), { target: { value: '50.00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать' }));

        expect(onConfirm).toHaveBeenCalledWith({
            type: 'record-payment',
            data: expect.objectContaining({ amountCents: 5000, method: 'BANK_TRANSFER' }),
        });
    });

    test('record-payment: does not submit a zero amount', () => {
        const { onConfirm } = renderModal({ type: 'record-payment', invoice });

        fireEvent.change(screen.getByLabelText('Сумма, EUR'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать' }));

        expect(onConfirm).not.toHaveBeenCalled();
    });

    test('confirm-paid: submits with the default payment method', () => {
        const { onConfirm } = renderModal({ type: 'confirm-paid', invoice });

        fireEvent.click(screen.getByRole('button', { name: 'Подтвердить оплату' }));

        expect(onConfirm).toHaveBeenCalledWith({
            type: 'confirm-paid',
            data: expect.objectContaining({ method: 'BANK_TRANSFER' }),
        });
    });

    test('create-credit: requires a reason before submitting', () => {
        const { onConfirm } = renderModal({ type: 'create-credit', invoice });

        fireEvent.change(screen.getByLabelText('Сумма, EUR'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: 'Создать кредит-ноту' }));
        expect(onConfirm).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Причина'), { target: { value: 'Возврат' } });
        fireEvent.click(screen.getByRole('button', { name: 'Создать кредит-ноту' }));

        expect(onConfirm).toHaveBeenCalledWith({
            type: 'create-credit',
            data: { amountCents: 1000, reason: 'Возврат' },
        });
    });

    test('create-debit: submits an adjustment', () => {
        const { onConfirm } = renderModal({ type: 'create-debit', invoice });

        fireEvent.change(screen.getByLabelText('Сумма, EUR'), { target: { value: '15' } });
        fireEvent.change(screen.getByLabelText('Причина'), { target: { value: 'Доп. услуга' } });
        fireEvent.click(screen.getByRole('button', { name: 'Создать корректировку' }));

        expect(onConfirm).toHaveBeenCalledWith({
            type: 'create-debit',
            data: { amountCents: 1500, reason: 'Доп. услуга' },
        });
    });

    test('cancel: confirming dispatches the cancel action', () => {
        const { onConfirm } = renderModal({ type: 'cancel', invoice });

        fireEvent.click(screen.getByRole('button', { name: 'Да, отменить инвойс' }));

        expect(onConfirm).toHaveBeenCalledWith({ type: 'cancel' } satisfies ActionResult);
    });

    test('closes without confirming when cancel button of a form is clicked', () => {
        const { onClose, onConfirm } = renderModal({ type: 'record-payment', invoice });

        fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
