import { render, screen } from '@testing-library/react';
import ClientListHeader from './ClientListHeader';

describe('MollieClient ClientListHeader', () => {
    test('renders the column titles', () => {
        render(<ClientListHeader />);

        expect(screen.getByText('Дата')).toBeInTheDocument();
        expect(screen.getByText('Имя Фамилия')).toBeInTheDocument();
        expect(screen.getByText('Имеил')).toBeInTheDocument();
        expect(screen.getByText('редактировать')).toBeInTheDocument();
    });
});
