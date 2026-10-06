import { render, screen } from '@testing-library/react';
import UserListItem from './UserListItem';
import { IProfile } from '@/entities/Profile';
import { RoleKey } from '@/entities/Role';

describe('UserListItem', () => {
    test('renders the name, email, and role label', () => {
        const user = { id: '1', firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com', role: RoleKey.ADMIN } as IProfile;
        render(<UserListItem user={user} />);

        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByText('ivan@example.com')).toBeInTheDocument();
        expect(screen.getByText('Администратор')).toBeInTheDocument();
    });

    test('shows the enabled status by default', () => {
        render(<UserListItem user={{ id: '1' } as IProfile} />);
        expect(screen.getByText('Вход разрешён')).toBeInTheDocument();
    });

    test('shows the blocked status when isEnabled is false', () => {
        render(<UserListItem user={{ id: '1', isEnabled: false } as IProfile} />);
        expect(screen.getByText('Вход заблокирован')).toBeInTheDocument();
    });

    test('renders the action returned by renderAction', () => {
        render(<UserListItem user={{ id: '1' } as IProfile} renderAction={() => <button>Delete</button>} />);
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
});
