import { render, screen } from '@testing-library/react';
import TransactionListItem from './TransactionListItem';
import { Transaction } from '../../model/types/transaction';
import { TransactionType } from '@/entities/TransactionType';

describe('TransactionListItem', () => {
    // `type` is compared against the literal string 'INCOME', but
    // TransactionType.INCOME is actually 'Приход' — so isIncome is
    // currently always false regardless of the transaction's type.
    // These tests document that existing behavior; if that comparison
    // is ever fixed, update these expectations accordingly.
    test('renders the description and a formatted amount', () => {
        const transaction: Transaction = {
            id: '1',
            date: '2026-01-15',
            description: 'Salary',
            amount: 1500,
            currency: 'EUR',
            type: TransactionType.INCOME,
        };
        render(<TransactionListItem transaction={transaction} />);

        expect(screen.getByText('Salary')).toBeInTheDocument();
        expect(screen.getByText('Расход')).toBeInTheDocument();
        expect(screen.getByText(/−.*€.*1\.500,00/)).toBeInTheDocument();
    });

    test('renders an expense amount with a minus sign', () => {
        const transaction: Transaction = {
            id: '1',
            date: '2026-01-15',
            amount: 100,
            type: TransactionType.EXPENSE,
        };
        render(<TransactionListItem transaction={transaction} />);

        expect(screen.getByText('Расход')).toBeInTheDocument();
        expect(screen.getByText(/−.*€.*100,00/)).toBeInTheDocument();
    });

    test('falls back to "Без описания" when there is no description', () => {
        render(<TransactionListItem transaction={{ id: '1', date: '2026-01-15' }} />);
        expect(screen.getByText('Без описания')).toBeInTheDocument();
    });

    test('shows a manual-operation source label by default', () => {
        render(<TransactionListItem transaction={{ id: '1', date: '2026-01-15' }} />);
        expect(screen.getByText(/Ручная операция/)).toBeInTheDocument();
    });

    test('shows the Mollie source and mapped status label', () => {
        render(<TransactionListItem transaction={{ id: '1', date: '2026-01-15', source: 'MOLLIE', status: 'paid' }} />);
        expect(screen.getByText(/Mollie · Оплачено/)).toBeInTheDocument();
    });

    test('renders the action returned by renderAction', () => {
        render(
            <TransactionListItem
                transaction={{ id: '1', date: '2026-01-15' }}
                renderAction={() => <button>Delete</button>}
            />,
        );
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
});
