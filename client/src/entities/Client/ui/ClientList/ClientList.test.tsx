import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ClientList } from './ClientList';
import { Client, ClientView } from '../../model/types/client';

function renderList(props: Partial<React.ComponentProps<typeof ClientList>> & { clients: Client[] }) {
    return render(
        <MemoryRouter>
            <ClientList view={ClientView.BIG} {...props} />
        </MemoryRouter>,
    );
}

describe('ClientList', () => {
    test('shows an empty state when there are no clients and it is not loading', () => {
        renderList({ clients: [] });
        expect(screen.getByText('Клиенты не найдены')).toBeInTheDocument();
    });

    test('renders a ClientListItem for each client', () => {
        renderList({ clients: [{ id: '1', firstName: 'Ivan' }, { id: '2', firstName: 'Petr' }] });

        expect(screen.getByText('Ivan')).toBeInTheDocument();
        expect(screen.getByText('Petr')).toBeInTheDocument();
    });

    test('renders the table header for the BIG view', () => {
        renderList({ clients: [{ id: '1', firstName: 'Ivan' }] });
        expect(screen.getByText('Имя Фамилия')).toBeInTheDocument();
    });

    test('does not render the table header for the SMALL view', () => {
        renderList({ clients: [{ id: '1', firstName: 'Ivan' }], view: ClientView.SMALL });
        expect(screen.queryByText('Имя Фамилия')).not.toBeInTheDocument();
    });
});
