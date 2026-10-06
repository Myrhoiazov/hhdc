import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ClientListItem from './ClientListItem';
import { Client, ClientView } from '../../model/types/client';

function renderItem(client: Client, view: ClientView = ClientView.BIG) {
    return render(
        <MemoryRouter>
            <ClientListItem client={client} view={view} />
        </MemoryRouter>,
    );
}

describe('ClientListItem', () => {
    test('renders the full name when present', () => {
        renderItem({ id: '1', firstName: 'Ivan', lastName: 'Petrov' });
        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
    });

    test('falls back to a placeholder name using the id', () => {
        renderItem({ id: '5' });
        expect(screen.getByText('Ученик #5')).toBeInTheDocument();
    });

    test('links to the client details route', () => {
        renderItem({ id: '5', firstName: 'Ivan' });
        const link = screen.getByText('Ivan').closest('a');
        expect(link).toHaveAttribute('href', expect.stringContaining('5'));
    });

    test('shows the linked payment badge when mollieLinks exist', () => {
        renderItem({ id: '1', mollieLinks: [{ customerId: 1 }] });
        expect(screen.getByText('Привязана')).toBeInTheDocument();
    });

    test('shows the unlinked payment badge otherwise', () => {
        renderItem({ id: '1' });
        expect(screen.getByText('Нет')).toBeInTheDocument();
    });

    test('renders the SMALL tile variant with its own labels', () => {
        renderItem({ id: '1' }, ClientView.SMALL);
        expect(screen.getByText('Нет платёжного аккаунта')).toBeInTheDocument();
        expect(screen.getByText('Без филиала')).toBeInTheDocument();
    });

    test('renders the action returned by renderAction', () => {
        render(
            <MemoryRouter>
                <ClientListItem client={{ id: '1' }} view={ClientView.BIG} renderAction={() => <button>Edit</button>} />
            </MemoryRouter>,
        );
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
});
