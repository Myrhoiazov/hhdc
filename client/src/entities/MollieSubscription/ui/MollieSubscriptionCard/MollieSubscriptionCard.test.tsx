import { fireEvent, render, screen } from '@testing-library/react';
import { MollieSubscriptionCard } from './MollieSubscriptionCard';
import { MollieSubscription } from '../../model/types/MollieSubscription';

describe('MollieSubscriptionCard', () => {
    test('renders the current field values', () => {
        const data: MollieSubscription = {
            interval: '1 month',
            times: 12,
            amount: { value: '25.00', currency: 'EUR' },
            description: 'Monthly fee',
        };
        render(<MollieSubscriptionCard data={data} />);

        expect(screen.getByDisplayValue('1 month')).toBeInTheDocument();
        expect(screen.getByDisplayValue('12')).toBeInTheDocument();
        expect(screen.getByDisplayValue('25.00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Monthly fee')).toBeInTheDocument();
    });

    test('calls onChangeSum with a Payment object built from the existing amount', () => {
        const onChangeSum = jest.fn();
        const data: MollieSubscription = { amount: { value: '25.00', currency: 'EUR' } };
        render(<MollieSubscriptionCard data={data} onChangeSum={onChangeSum} />);

        fireEvent.change(screen.getByDisplayValue('25.00'), { target: { value: '30.00' } });

        expect(onChangeSum).toHaveBeenCalledWith({ value: '30.00', currency: 'EUR' });
    });

    test('calls onChangeDescription when the description input changes', () => {
        const onChangeDescription = jest.fn();
        render(<MollieSubscriptionCard onChangeDescription={onChangeDescription} />);

        const descriptionInput = screen.getByPlaceholderText('Какое направление танцев');
        fireEvent.change(descriptionInput, { target: { value: 'New description' } });

        expect(onChangeDescription).toHaveBeenCalledWith('New description');
    });
});
