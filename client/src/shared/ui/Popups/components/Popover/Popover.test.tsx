import { fireEvent, render, screen } from '@testing-library/react';
import { Popover } from './Popover';

describe('Popover', () => {
    test('renders the trigger', () => {
        render(<Popover trigger={<span>Open</span>}><div>Panel content</div></Popover>);
        expect(screen.getByText('Open')).toBeInTheDocument();
    });

    test('does not show the panel content until the trigger is clicked', () => {
        render(<Popover trigger={<span>Open</span>}><div>Panel content</div></Popover>);
        expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
    });

    test('shows the panel content after clicking the trigger', async () => {
        render(<Popover trigger={<span>Open</span>}><div>Panel content</div></Popover>);

        fireEvent.click(screen.getByText('Open'));

        expect(await screen.findByText('Panel content')).toBeInTheDocument();
    });
});
