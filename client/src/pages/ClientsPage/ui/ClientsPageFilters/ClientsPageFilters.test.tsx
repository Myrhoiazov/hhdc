import { render, screen } from '@testing-library/react';
import ClientsPageFilters from './ClientsPageFilters';

describe('ClientsPageFilters', () => {
    test('renders the filters placeholder text', () => {
        render(<ClientsPageFilters />);

        expect(screen.getByText('Фильтры')).toBeInTheDocument();
    });
});
