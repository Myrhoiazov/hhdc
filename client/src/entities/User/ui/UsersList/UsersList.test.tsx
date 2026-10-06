import { render, screen } from '@testing-library/react';
import { UsersList } from './UsersList';
import { IProfile } from '@/entities/Profile';

describe('UsersList', () => {
    test('shows an empty state when there are no users and it is not loading', () => {
        render(<UsersList users={[]} />);
        expect(screen.getByText('Пользователи не найдены')).toBeInTheDocument();
    });

    test('renders a UserListItem for each user', () => {
        const users = [{ id: '1', firstName: 'Ivan' }, { id: '2', firstName: 'Petr' }] as IProfile[];
        render(<UsersList users={users} />);

        expect(screen.getByText(/Ivan/)).toBeInTheDocument();
        expect(screen.getByText(/Petr/)).toBeInTheDocument();
    });

    test('renders a loading skeleton', () => {
        const { container } = render(<UsersList users={[]} isLoading />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(4);
    });
});
