import { fireEvent, render, screen } from '@testing-library/react';
import CheckBox from './CheckBox';

describe('CheckBox', () => {
    test('renders without a label when none is given', () => {
        render(<CheckBox value={false} />);
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    test('renders the label text when given', () => {
        render(<CheckBox value={false} label="Accept terms" />);
        expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    test('reflects the checked state', () => {
        render(<CheckBox value />);
        expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    });

    test('calls onChange with the new value when toggled', () => {
        const onChange = jest.fn();
        render(<CheckBox value={false} onChange={onChange} />);

        fireEvent.click(screen.getByRole('checkbox'));

        expect(onChange).toHaveBeenCalledWith(true);
    });
});
