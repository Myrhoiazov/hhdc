import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { IProfile } from '@/entities/Profile/model/types/profile';

const data: IProfile = { id: '1', firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com' };

describe('ProfileCard', () => {
    test('renders the profile field values', () => {
        render(<ProfileCard data={data} readonly />);

        expect(screen.getByDisplayValue('Ivan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Petrov')).toBeInTheDocument();
        expect(screen.getByDisplayValue('ivan@example.com')).toBeInTheDocument();
    });

    test('calls onChangeFirstname when the first name input changes', () => {
        const onChangeFirstname = jest.fn();
        render(<ProfileCard data={data} onChangeFirstname={onChangeFirstname} />);

        fireEvent.change(screen.getByDisplayValue('Ivan'), { target: { value: 'Petr' } });

        expect(onChangeFirstname).toHaveBeenCalledWith('Petr');
    });

    test('renders skeletons while loading', () => {
        const { container } = render(<ProfileCard isLoading />);
        expect(container.querySelectorAll('.Skeleton').length).toBeGreaterThan(0);
        expect(screen.queryByDisplayValue('Ivan')).not.toBeInTheDocument();
    });

    test('renders an error state', () => {
        render(<ProfileCard error={{ status: 500 }} />);
        expect(screen.getByText('Произошла ошибка при загрузке профиля')).toBeInTheDocument();
    });
});
