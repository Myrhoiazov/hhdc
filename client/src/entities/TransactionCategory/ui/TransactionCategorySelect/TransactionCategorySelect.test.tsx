import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionCategorySelect } from './TransactionCategorySelect';
import { TransactionCategory } from '../../model/types/transactionCategory';

describe('TransactionCategorySelect', () => {
    test('renders every category option', () => {
        render(<TransactionCategorySelect />);

        Object.values(TransactionCategory).forEach((category) => {
            expect(screen.getByRole('option', { name: category })).toBeInTheDocument();
        });
    });

    test('calls onChange with the selected category', () => {
        const onChange = jest.fn();
        render(<TransactionCategorySelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: TransactionCategory.HEALTH } });

        expect(onChange).toHaveBeenCalledWith(TransactionCategory.HEALTH);
    });
});
