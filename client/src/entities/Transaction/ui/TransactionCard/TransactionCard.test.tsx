import { fireEvent, render, screen } from '@testing-library/react';
import TransactionCard from './TransactionCard';
import { Transaction } from '@/entities/Transaction';

describe('TransactionCard', () => {
    test('renders the current field values', () => {
        const data: Transaction = { amount: '100.00', description: 'Notes' };
        render(<TransactionCard data={data} />);

        expect(screen.getByDisplayValue('100.00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Notes')).toBeInTheDocument();
    });

    test('calls onChangeSum when the amount input changes', () => {
        const onChangeSum = jest.fn();
        render(<TransactionCard onChangeSum={onChangeSum} />);

        fireEvent.change(screen.getByPlaceholderText('100.00'), { target: { value: '250.00' } });

        expect(onChangeSum).toHaveBeenCalledWith('250.00');
    });

    test('calls onChangeDescription when the description textarea changes', () => {
        const onChangeDescription = jest.fn();
        render(<TransactionCard onChangeDescription={onChangeDescription} />);

        fireEvent.change(screen.getByLabelText('Дополнительная информация:'), { target: { value: 'New note' } });

        expect(onChangeDescription).toHaveBeenCalledWith('New note');
    });
});
