import { render, screen } from '@testing-library/react';
import { TransactionList } from './TransactionList';
import { Transaction } from '../../model/types/transaction';

describe('TransactionList', () => {
    test('shows an empty state when there are no transactions and it is not loading', () => {
        render(<TransactionList transactions={[]} />);
        expect(screen.getByText('Транзакции не найдены')).toBeInTheDocument();
    });

    test('renders a TransactionListItem for each transaction', () => {
        const transactions = [
            { id: '1', date: '2026-01-15', description: 'First' },
            { id: '2', date: '2026-01-16', description: 'Second' },
        ] as Transaction[];
        render(<TransactionList transactions={transactions} />);

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
    });

    test('renders a loading skeleton', () => {
        const { container } = render(<TransactionList transactions={[]} isLoading />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(4);
    });
});
