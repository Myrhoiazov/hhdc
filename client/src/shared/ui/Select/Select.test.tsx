import { fireEvent, render, screen } from '@testing-library/react';
import { Select } from './Select';

const options = [
    { value: 'a', content: 'Option A' },
    { value: 'b', content: 'Option B' },
];

describe('Select', () => {
    test('renders the given options', () => {
        render(<Select options={options} onChange={() => {}} />);

        expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
    });

    test('renders the label when given', () => {
        render(<Select options={options} onChange={() => {}} label="Choose" />);
        expect(screen.getByText('Choose')).toBeInTheDocument();
    });

    test('renders a hidden default option with the given placeholder text', () => {
        render(<Select options={options} onChange={() => {}} defaultValue="Pick one" />);
        expect(screen.getByRole('option', { name: 'Pick one' })).toBeInTheDocument();
    });

    test('calls onChange with the selected value', () => {
        const onChange = jest.fn();
        render(<Select options={options} onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });

        expect(onChange).toHaveBeenCalledWith('b');
    });

    test('disables the select when readonly', () => {
        render(<Select options={options} onChange={() => {}} readonly />);
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
