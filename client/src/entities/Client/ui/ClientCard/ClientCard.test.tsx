import { fireEvent, render, screen } from '@testing-library/react';
import { ClientCard } from './ClientCard';
import { Client } from '@/entities/Client';

describe('ClientCard', () => {
    test('renders the current field values', () => {
        const data: Client = { firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com' };
        render(<ClientCard data={data} />);

        expect(screen.getByDisplayValue('Ivan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Petrov')).toBeInTheDocument();
        expect(screen.getByDisplayValue('ivan@example.com')).toBeInTheDocument();
    });

    test('calls onChangeFirstName when the first name input changes', () => {
        const onChangeFirstName = jest.fn();
        render(<ClientCard onChangeFirstName={onChangeFirstName} />);

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Petr' } });

        expect(onChangeFirstName).toHaveBeenCalledWith('Petr');
    });

    test('renders the given branch options', () => {
        render(<ClientCard branchOptions={[{ value: '1', content: 'Central' }]} />);
        expect(screen.getByRole('option', { name: 'Central' })).toBeInTheDocument();
    });

    test('renders the client language options', () => {
        render(<ClientCard />);
        expect(screen.getByRole('option', { name: 'Русский' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Английский' })).toBeInTheDocument();
    });
});
