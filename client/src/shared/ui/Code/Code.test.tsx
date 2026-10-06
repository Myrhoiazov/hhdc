import { fireEvent, render, screen } from '@testing-library/react';
import { Code } from './Code';

describe('Code', () => {
    test('renders the given text', () => {
        render(<Code text="const x = 1;" />);
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    test('copies the text to the clipboard when the copy button is clicked', () => {
        const writeText = jest.fn();
        Object.assign(navigator, { clipboard: { writeText } });

        render(<Code text="const x = 1;" />);
        fireEvent.click(screen.getByRole('button'));

        expect(writeText).toHaveBeenCalledWith('const x = 1;');
    });
});
