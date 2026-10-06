import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionSortSelector } from './TransactionSortSelector';
import { TransactionSortField } from '@/entities/Transaction';
import { Month } from '@/entities/Month';

describe('TransactionSortSelector', () => {
    test('renders the current sort field, order, and month', () => {
        render(
            <TransactionSortSelector
                sort={TransactionSortField.DATE}
                order="asc"
                month={Month.ALL}
                onChangeOrder={() => {}}
                onChangeSort={() => {}}
                onChangeMonth={() => {}}
            />,
        );

        expect(screen.getByText('дате создания')).toBeInTheDocument();
        expect(screen.getByText('возрастанию')).toBeInTheDocument();
        expect(screen.getByText('Все месяцы')).toBeInTheDocument();
    });

    test('calls onChangeMonth when a new month is picked', async () => {
        const onChangeMonth = jest.fn();
        render(
            <TransactionSortSelector
                sort={TransactionSortField.DATE}
                order="asc"
                month={Month.ALL}
                onChangeOrder={() => {}}
                onChangeSort={() => {}}
                onChangeMonth={onChangeMonth}
            />,
        );

        fireEvent.click(screen.getByText('Все месяцы'));
        fireEvent.click(await screen.findByText('Март'));

        expect(onChangeMonth).toHaveBeenCalledWith(Month.MARCH);
    });

    test('calls onChangeSort when a new sort field is picked', async () => {
        const onChangeSort = jest.fn();
        render(
            <TransactionSortSelector
                sort={TransactionSortField.DATE}
                order="asc"
                month={Month.ALL}
                onChangeOrder={() => {}}
                onChangeSort={onChangeSort}
                onChangeMonth={() => {}}
            />,
        );

        fireEvent.click(screen.getByText('дате создания'));
        fireEvent.click(await screen.findByText('по категории'));

        expect(onChangeSort).toHaveBeenCalledWith(TransactionSortField.CATEGORY);
    });
});
