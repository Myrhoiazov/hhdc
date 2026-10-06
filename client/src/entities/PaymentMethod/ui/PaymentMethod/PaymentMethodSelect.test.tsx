import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentMethodSelect } from './PaymentMethodSelect';
import { PaymentMethod } from '../../model/types/paymentMethod';

describe('PaymentMethodSelect', () => {
    test('renders every payment method option', () => {
        render(<PaymentMethodSelect />);

        Object.values(PaymentMethod).forEach((method) => {
            expect(screen.getByRole('option', { name: method })).toBeInTheDocument();
        });
    });

    test('calls onChange with the selected method', () => {
        const onChange = jest.fn();
        render(<PaymentMethodSelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: PaymentMethod.CARD } });

        expect(onChange).toHaveBeenCalledWith(PaymentMethod.CARD);
    });
});
