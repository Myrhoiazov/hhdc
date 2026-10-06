import { fireEvent, render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';
import { IProfile } from '@/entities/Profile';

const data: IProfile = { id: '1', firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com' };

describe('UserCard', () => {
    test('renders the field values', () => {
        render(<UserCard data={data} readonly />);
        expect(screen.getByDisplayValue('Ivan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Petrov')).toBeInTheDocument();
    });

    test('calls onChangeEmail when the email input changes', () => {
        const onChangeEmail = jest.fn();
        render(<UserCard data={data} onChangeEmail={onChangeEmail} />);

        fireEvent.change(screen.getByDisplayValue('ivan@example.com'), { target: { value: 'new@example.com' } });

        expect(onChangeEmail).toHaveBeenCalledWith('new@example.com');
    });

    test('renders skeletons while loading', () => {
        const { container } = render(<UserCard isLoading />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(5);
        expect(screen.queryByDisplayValue('Ivan')).not.toBeInTheDocument();
    });
});
