import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dropdown, DropdownItem } from './Dropdown';

const items: DropdownItem[] = [
    { content: 'Edit', onClick: jest.fn() },
    { content: 'Delete', onClick: jest.fn(), disabled: true },
];

function renderDropdown(dropdownItems: DropdownItem[] = items) {
    return render(
        <MemoryRouter>
            <Dropdown trigger={<span>Open menu</span>} items={dropdownItems} />
        </MemoryRouter>,
    );
}

describe('Dropdown', () => {
    test('renders the trigger', () => {
        renderDropdown();
        expect(screen.getByText('Open menu')).toBeInTheDocument();
    });

    test('shows the items after clicking the trigger', async () => {
        renderDropdown();

        fireEvent.click(screen.getByText('Open menu'));

        expect(await screen.findByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    test('calls the item onClick when an enabled item is clicked', async () => {
        const onClick = jest.fn();
        renderDropdown([{ content: 'Edit', onClick }]);

        fireEvent.click(screen.getByText('Open menu'));
        fireEvent.click(await screen.findByText('Edit'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('disables an item marked as disabled', async () => {
        renderDropdown();

        fireEvent.click(screen.getByText('Open menu'));

        const deleteButton = (await screen.findByText('Delete')).closest('button');
        expect(deleteButton).toBeDisabled();
    });

    test('renders a link item as an AppLink when href is given', async () => {
        renderDropdown([{ content: 'Profile', href: '/profile' }]);

        fireEvent.click(screen.getByText('Open menu'));

        const link = (await screen.findByText('Profile')).closest('a');
        expect(link).toHaveAttribute('href', '/profile');
    });
});
