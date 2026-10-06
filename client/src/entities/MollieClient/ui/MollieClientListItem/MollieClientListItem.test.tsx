import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import MollieClientListItem from './MollieClientListItem';
import { MollieClient } from '../../model/types/mollieClient';

function renderItem(client: MollieClient) {
    return render(
        <MemoryRouter>
            <MollieClientListItem client={client} />
        </MemoryRouter>,
    );
}

test('MollieClientListItem renders the payer name and email', () => {
    renderItem({ id: '1', givenName: 'Ivan', familyName: 'Petrov', email: 'ivan@example.com' });

    expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
    expect(screen.getByText('ivan@example.com')).toBeInTheDocument();
});

test('MollieClientListItem falls back to the email as payer name when there is no given/family name', () => {
    renderItem({ id: '1', email: 'ivan@example.com' });
    expect(screen.getAllByText('ivan@example.com')).toHaveLength(2);
});

test('MollieClientListItem shows "Нет ученика" when there are no linked students', () => {
    renderItem({ id: '1' });
    expect(screen.getByText('Нет ученика')).toBeInTheDocument();
});

test('MollieClientListItem renders a link for each linked student', () => {
    renderItem({
        id: '1',
        clientLinks: [{ id: 'link_1', client: { id: '5', firstName: 'Petr' } }],
    });

    // the i18next mock returns the raw, un-interpolated key
    const link = screen.getByText('Ученик: {{studentName}}').closest('a');
    expect(link).toHaveAttribute('href', '/clients/5');
});

test('MollieClientListItem marks the "active subscriptions" badge active only when there is at least one', () => {
    renderItem({
        id: '1',
        subscriptions: [{ id: 'sub_1', status: 'active' }, { id: 'sub_2', status: 'canceled' }],
    });

    expect(screen.getByText('Активные: {{count}}')).toHaveClass('active');
});

test('MollieClientListItem renders the action returned by renderAction', () => {
    render(
        <MemoryRouter>
            <MollieClientListItem client={{ id: '1' }} renderAction={() => <button>Edit</button>} />
        </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
});

test('MollieClientListItem clickable info row exposes a button role for keyboard/screen-reader users', () => {
    const { container } = renderItem({ id: '7' });
    const infoRow = container.querySelector('[role="button"]');

    expect(infoRow).toBeInTheDocument();
    expect(infoRow).toHaveAttribute('tabIndex', '0');
});
