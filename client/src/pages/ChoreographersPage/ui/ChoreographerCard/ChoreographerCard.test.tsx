import { fireEvent, render, screen } from '@testing-library/react';
import { ChoreographerCard, Choreographer } from './ChoreographerCard';

const choreographer: Choreographer = {
    id: 1,
    firstName: 'Ivan',
    lastName: 'Petrov',
    category: 'PRO',
    experience: 5,
    email: 'ivan@example.com',
    phone: '+380501234567',
    showOnSite: true,
};

describe('ChoreographerCard', () => {
    test('renders the name, category, and contacts', () => {
        render(<ChoreographerCard choreographer={choreographer} onEdit={() => {}} onDelete={() => {}} />);

        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByText('Pro')).toBeInTheDocument();
        expect(screen.getByText('ivan@example.com')).toBeInTheDocument();
        expect(screen.getByText('+380501234567')).toBeInTheDocument();
    });

    test('renders initials when there is no photo', () => {
        render(<ChoreographerCard choreographer={choreographer} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('IP')).toBeInTheDocument();
    });

    test('shows a "hidden" badge when not shown on site', () => {
        render(<ChoreographerCard choreographer={{ ...choreographer, showOnSite: false }} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('Скрыт')).toBeInTheDocument();
    });

    test('calls onEdit and onDelete', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        render(<ChoreographerCard choreographer={choreographer} onEdit={onEdit} onDelete={onDelete} />);

        fireEvent.click(screen.getByTitle('Редактировать'));
        fireEvent.click(screen.getByTitle('Удалить'));

        expect(onEdit).toHaveBeenCalledWith(choreographer);
        expect(onDelete).toHaveBeenCalledWith(1);
    });
});
