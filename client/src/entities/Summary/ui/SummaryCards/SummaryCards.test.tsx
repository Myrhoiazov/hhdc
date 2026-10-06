import { render, screen } from '@testing-library/react';
import { SummaryCards } from './SummaryCards';
import { Summary } from '../../model/types/summary';

describe('SummaryCards', () => {
    test('shows a "not found" message when there is no summary', () => {
        render(<SummaryCards />);
        expect(screen.getByText('Клиенты не найдены')).toBeInTheDocument();
    });

    test('formats income, expense, and balance as EUR currency', () => {
        const summary: Summary = { income: 1500, expense: 200, balance: 1300 };
        render(<SummaryCards summary={summary} />);

        expect(screen.getByText('€ 1.500,00')).toBeInTheDocument();
        expect(screen.getByText('€ 200,00')).toBeInTheDocument();
        expect(screen.getByText('€ 1.300,00')).toBeInTheDocument();
    });

    test('renders skeletons while loading', () => {
        const { container } = render(<SummaryCards isLoading />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(3);
    });
});
