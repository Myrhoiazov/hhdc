import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionFilters } from './TransactionFilters';
import { TransactionSortField } from '@/entities/Transaction';
import { Month } from '@/entities/Month';

function renderFilters(props: Partial<React.ComponentProps<typeof TransactionFilters>> = {}) {
    return render(
        <MemoryRouter>
            <TransactionFilters
                search=""
                month={Month.ALL}
                sort={TransactionSortField.DATE}
                order="asc"
                onChangeSearch={() => {}}
                onChangeOrder={() => {}}
                onChangeSort={() => {}}
                onChangeMonth={() => {}}
                {...props}
            />
        </MemoryRouter>,
    );
}

describe('TransactionFilters', () => {
    test('renders the search input and create button', () => {
        renderFilters();
        expect(screen.getByPlaceholderText('Поиск')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Создать/ })).toBeInTheDocument();
    });

    test('calls onChangeSearch when the search input changes', () => {
        const onChangeSearch = jest.fn();
        renderFilters({ onChangeSearch });

        fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'rent' } });

        expect(onChangeSearch).toHaveBeenCalledWith('rent');
    });
});
