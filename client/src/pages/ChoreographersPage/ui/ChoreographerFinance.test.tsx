import { renderAt, ALL, answerChoreographerRequests } from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    ChoreographerFinance,
    getChoreographerFinance,
    movePayout,
    recordChoreographerExpense,
    recordFeeAgreement,
    recordPayout,
    payoutActions,
} from '@/entities/Choreographer';

answerChoreographerRequests();

const eurTotals = {
    currency: 'EUR',
    agreedFee: '2500.00',
    estimatedExpenses: '300.00',
    actualExpenses: '680.00',
    confirmedPayments: '500.00',
    outstandingFee: '2000.00',
    organizerTotalCost: '3180.00',
};
const finance: ChoreographerFinance = {
    years: [
        {
            year: 2026,
            totals: [
                eurTotals,
                {
                    ...eurTotals,
                    currency: 'USD',
                    agreedFee: null,
                    outstandingFee: null,
                    actualExpenses: '200.00',
                },
            ],
        },
    ],
    assignments: [
        {
            id: 'assignment-26',
            roleTitle: 'Choreographer',
            status: 'COMPLETED',
            year: 2026,
            event: { id: 'event-2026', name: 'HHDC 2026', startAt: '2026-05-15T08:00:00.000Z' },
            totals: [eurTotals],
            agreements: [
                {
                    id: 'fee-3',
                    status: 'AGREED',
                    amount: '2500',
                    currency: 'EUR',
                    feeBasis: 'EVENT',
                    scopeDescription: null,
                    notes: null,
                    createdAt: '2026-02-01T10:00:00.000Z',
                },
                {
                    id: 'fee-1',
                    status: 'PROPOSED',
                    amount: '2000',
                    currency: 'EUR',
                    feeBasis: 'EVENT',
                    scopeDescription: null,
                    notes: 'First offer',
                    createdAt: '2026-01-10T10:00:00.000Z',
                },
            ],
            expenses: [
                {
                    id: 'exp-1',
                    type: 'HOTEL',
                    description: null,
                    currency: 'EUR',
                    estimatedAmount: null,
                    actualAmount: '280',
                    paidBy: 'ORGANIZER',
                    reimbursable: false,
                    status: 'PAID',
                    expenseDate: null,
                },
            ],
            payments: [
                {
                    id: 'pay-1',
                    type: 'ADVANCE',
                    amount: '500',
                    currency: 'EUR',
                    status: 'CONFIRMED',
                    paymentDate: '2026-03-01',
                    reference: null,
                },
                {
                    id: 'pay-2',
                    type: 'FEE',
                    amount: '2000',
                    currency: 'EUR',
                    status: 'PENDING',
                    paymentDate: null,
                    reference: null,
                },
            ],
        },
    ],
};
const FINANCE = [...ALL, 'choreographers.finance.read', 'choreographers.finance.write'];

test('the finance tab keeps currencies apart and shows the negotiation, expenses and payments of each event', async () => {
    jest.mocked(getChoreographerFinance).mockResolvedValue(finance);
    renderAt('/people/choreographers/person-1/finance', FINANCE);

    const year = await screen.findByRole('region', { name: 'Finance 2026' });
    expect(year).toHaveTextContent('2500.00 EUR');
    expect(year).toHaveTextContent('200.00 USD');
    const event = screen.getByRole('article', { name: 'HHDC 2026' });
    expect(event).toHaveTextContent('2000 EUR');
    expect(event).toHaveTextContent('First offer');
    expect(event).toHaveTextContent('EXPENSE_HOTEL: 280 EUR');
    expect(event).toHaveTextContent('PAYOUT_ADVANCE: 500 EUR');
});

test('a fee step, an expense and a payment are recorded for the assignment and the ledger is reloaded', async () => {
    jest.mocked(getChoreographerFinance).mockResolvedValue(finance);
    renderAt('/people/choreographers/person-1/finance', FINANCE);

    const fee = await screen.findByRole('form', { name: 'Record fee' });
    fireEvent.change(fee.querySelector('[name="status"]')!, { target: { value: 'AGREED' } });
    fireEvent.change(fee.querySelector('[name="amount"]')!, { target: { value: '2600' } });
    fireEvent.submit(fee);
    await waitFor(() =>
        expect(recordFeeAgreement).toHaveBeenCalledWith('assignment-26', {
            status: 'AGREED',
            amount: '2600',
            currency: 'EUR',
            notes: '',
        })
    );

    const expense = screen.getByRole('form', { name: 'Record expense' });
    fireEvent.change(expense.querySelector('[name="actualAmount"]')!, { target: { value: '400' } });
    fireEvent.submit(expense);
    await waitFor(() =>
        expect(recordChoreographerExpense).toHaveBeenCalledWith(
            'assignment-26',
            expect.objectContaining({
                category: 'TRAVEL',
                actualAmount: '400',
                estimatedAmount: null,
                paidBy: 'ORGANIZER',
                reimbursable: false,
            })
        )
    );

    const payment = screen.getByRole('form', { name: 'Record payment' });
    fireEvent.change(payment.querySelector('[name="amount"]')!, { target: { value: '2000' } });
    fireEvent.submit(payment);
    await waitFor(() =>
        expect(recordPayout).toHaveBeenCalledWith('assignment-26', {
            type: 'FEE',
            amount: '2000',
            currency: 'EUR',
            status: 'PLANNED',
            reference: '',
        })
    );
    await waitFor(() => expect(getChoreographerFinance).toHaveBeenCalledTimes(4));
});

test('confirming a payment is offered only with its own permission', async () => {
    jest.mocked(getChoreographerFinance).mockResolvedValue(finance);
    const view = renderAt('/people/choreographers/person-1/finance', FINANCE);

    await screen.findByRole('article', { name: 'HHDC 2026' });
    expect(
        screen.queryByRole('button', { name: 'MOVE_CONFIRMED: 2000 EUR' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MOVE_FAILED: 2000 EUR' })).toBeInTheDocument();
    view.unmount();

    renderAt('/people/choreographers/person-1/finance', [
        ...FINANCE,
        'choreographers.payments.confirm',
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'MOVE_CONFIRMED: 2000 EUR' }));
    await waitFor(() => expect(movePayout).toHaveBeenCalledWith('pay-2', 'CONFIRMED'));
});

test('without the finance permission the tab does not exist and nothing is requested', async () => {
    renderAt('/people/choreographers/person-1/finance', ALL);

    expect(await screen.findByRole('link', { name: 'Overview' })).toHaveAttribute(
        'aria-current',
        'page'
    );
    expect(screen.queryByRole('link', { name: 'Finance' })).not.toBeInTheDocument();
    expect(getChoreographerFinance).not.toHaveBeenCalled();
});

test('payment actions: read-only users get none, and only confirmers may touch a confirmed payment', () => {
    expect(payoutActions('PENDING', { canWrite: false, canConfirm: true })).toEqual([]);
    expect(payoutActions('PLANNED', { canWrite: true, canConfirm: false })).toEqual([
        'PENDING',
        'CANCELLED',
    ]);
    expect(payoutActions('CONFIRMED', { canWrite: true, canConfirm: false })).toEqual([]);
    expect(payoutActions('CONFIRMED', { canWrite: true, canConfirm: true })).toEqual(['CANCELLED']);
    expect(payoutActions('CANCELLED', { canWrite: true, canConfirm: true })).toEqual([]);
});
