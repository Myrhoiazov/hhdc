import { fireEvent, render, screen } from '@testing-library/react';
import { MonthSelect } from './MonthSelect';
import { Month } from '../../model/types/month';

describe('MonthSelect', () => {
    test('renders every month option', () => {
        render(<MonthSelect />);
        expect(screen.getByRole('option', { name: Month.JANUARY })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: Month.DECEMBER })).toBeInTheDocument();
    });

    test('calls onChange with the selected month', () => {
        const onChange = jest.fn();
        render(<MonthSelect onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: Month.MARCH } });

        expect(onChange).toHaveBeenCalledWith(Month.MARCH);
    });

    test('disables the select when readonly', () => {
        render(<MonthSelect readonly />);
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
