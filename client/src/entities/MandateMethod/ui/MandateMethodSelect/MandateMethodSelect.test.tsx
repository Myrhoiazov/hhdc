import { fireEvent, render, screen } from '@testing-library/react';
import { MandateMethodSelect } from './MandateMethodSelect';
import { MandateMethod } from '../../model/types/mandatemethod';

describe('MandateMethodSelect', () => {
    test('renders every mandate method option', () => {
        render(<MandateMethodSelect />);

        Object.values(MandateMethod).forEach((method) => {
            expect(screen.getByRole('option', { name: method })).toBeInTheDocument();
        });
    });

    test('calls onChange with the selected method', () => {
        const onChange = jest.fn();
        render(<MandateMethodSelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: MandateMethod.PAYPAL } });

        expect(onChange).toHaveBeenCalledWith(MandateMethod.PAYPAL);
    });
});
