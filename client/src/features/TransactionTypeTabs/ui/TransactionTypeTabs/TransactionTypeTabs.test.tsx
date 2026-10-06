import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionTypeTabs } from './TransactionTypeTabs';
import { TransactionType } from '@/entities/TransactionType';

describe('TransactionTypeTabs', () => {
    test('renders all three tabs', () => {
        render(<TransactionTypeTabs value={TransactionType.ALL} onChangeType={() => {}} />);

        expect(screen.getByText('Все транзакции')).toBeInTheDocument();
        expect(screen.getByText('Приход')).toBeInTheDocument();
        expect(screen.getByText('Расход')).toBeInTheDocument();
    });

    test('calls onChangeType with the clicked tab value', () => {
        const onChangeType = jest.fn();
        render(<TransactionTypeTabs value={TransactionType.ALL} onChangeType={onChangeType} />);

        fireEvent.click(screen.getByText('Приход'));

        expect(onChangeType).toHaveBeenCalledWith(TransactionType.INCOME);
    });
});
