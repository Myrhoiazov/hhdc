import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
    test('renders the given value', () => {
        render(<Input value="hello" onChange={() => {}} />);
        expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    });

    test('associates its label with the input for accessible form queries', () => {
        render(<Input value="" onChange={() => {}} label="First name" />);
        expect(screen.getByLabelText('First name')).toBeInTheDocument();
    });

    test('calls onChange with the new text value', () => {
        const onChange = jest.fn();
        render(<Input value="" onChange={onChange} />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ivan' } });

        expect(onChange).toHaveBeenCalledWith('Ivan');
    });

    test('calls onChange with a single File for a file input', () => {
        const onChange = jest.fn();
        render(<Input type="file" onChange={onChange} />);
        const file = new File(['content'], 'photo.png', { type: 'image/png' });

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(onChange).toHaveBeenCalledWith(file);
    });

    test('marks the input readOnly when readonly is set', () => {
        render(<Input value="locked" onChange={() => {}} readonly />);
        expect(screen.getByDisplayValue('locked')).toHaveAttribute('readOnly');
    });
});
