import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionSelect } from './TransactionSelect';
import { TransactionType } from '../../model/types/transactionType';

describe('TransactionSelect', () => {
    test('renders income and expense options', () => {
        render(<TransactionSelect />);
        expect(screen.getByRole('option', { name: TransactionType.INCOME })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: TransactionType.EXPENSE })).toBeInTheDocument();
    });

    test('calls onChange with the selected type', () => {
        const onChange = jest.fn();
        render(<TransactionSelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: TransactionType.EXPENSE } });

        expect(onChange).toHaveBeenCalledWith(TransactionType.EXPENSE);
    });

    test('disables the select when readonly', () => {
        render(<TransactionSelect readonly />);
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
