import { fireEvent, render, screen } from '@testing-library/react';
import { ListBox } from './ListBox';

const items = [
    { value: 'a', content: 'Option A' },
    { value: 'b', content: 'Option B' },
];

describe('ListBox', () => {
    test('shows the default value when nothing is selected', () => {
        render(<ListBox items={items} onChange={() => {}} defaultValue="Choose" />);
        expect(screen.getByText('Choose')).toBeInTheDocument();
    });

    test('shows the selected item content', () => {
        render(<ListBox items={items} value="b" onChange={() => {}} defaultValue="Choose" />);
        expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    test('renders the label when given', () => {
        render(<ListBox items={items} onChange={() => {}} label="Pick a value" />);
        expect(screen.getByText('Pick a value')).toBeInTheDocument();
    });

    test('opens the options and calls onChange when an option is picked', async () => {
        const onChange = jest.fn();
        render(<ListBox items={items} onChange={onChange} defaultValue="Choose" />);

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Option A'));

        expect(onChange).toHaveBeenCalledWith('a');
    });

    test('disables the trigger button when readonly', () => {
        render(<ListBox items={items} onChange={() => {}} readonly defaultValue="Choose" />);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
