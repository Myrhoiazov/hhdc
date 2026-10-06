import { render, screen } from '@testing-library/react';
import ClientListHeader from './ClientListHeader';

describe('ClientListHeader', () => {
    test('renders the column titles', () => {
        render(<ClientListHeader />);

        expect(screen.getByText('Имя Фамилия')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Филиал')).toBeInTheDocument();
        expect(screen.getByText('Оплата')).toBeInTheDocument();
        expect(screen.getByText('Действия')).toBeInTheDocument();
    });
});
