import { fireEvent, render, screen } from '@testing-library/react';
import Textarea from './Textarea';

describe('Textarea', () => {
    test('renders the given value', () => {
        render(<Textarea value="hello" onChange={() => {}} />);
        expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    });

    test('renders a placeholder label associated with the textarea', () => {
        render(<Textarea value="" onChange={() => {}} placeholder="Notes" />);
        const textarea = screen.getByLabelText('Notes');
        expect(textarea).toBeInTheDocument();
    });

    test('calls onChange with the new text value', () => {
        const onChange = jest.fn();
        render(<Textarea value="" onChange={onChange} />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Some notes' } });

        expect(onChange).toHaveBeenCalledWith('Some notes');
    });
});
