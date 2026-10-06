import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { MollieClientList } from './MollieClientList';
import { MollieClient } from '../../model/types/mollieClient';

function renderList(props: Partial<React.ComponentProps<typeof MollieClientList>> & { clients: MollieClient[] }) {
    return render(
        <MemoryRouter>
            <MollieClientList {...props} />
        </MemoryRouter>,
    );
}

describe('MollieClientList', () => {
    test('shows an error state when there is an error', () => {
        renderList({ clients: [], error: 'boom' });
        expect(screen.getByText('Не удалось загрузить платёжные профили')).toBeInTheDocument();
    });

    test('shows an empty state when there are no clients and it is not loading', () => {
        renderList({ clients: [] });
        expect(screen.getByText('Платёжные профили не найдены')).toBeInTheDocument();
    });

    test('renders a MollieClientListItem for each client', () => {
        renderList({ clients: [{ id: '1', email: 'a@b.com' }, { id: '2', email: 'c@d.com' }] });

        expect(screen.getAllByText('a@b.com').length).toBeGreaterThan(0);
        expect(screen.getAllByText('c@d.com').length).toBeGreaterThan(0);
    });
});
