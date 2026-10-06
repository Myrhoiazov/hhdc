import { fireEvent, render, screen } from '@testing-library/react';
import { ClientSortSelector } from './ClientSortSelector';
import { ClientSortField } from '@/entities/Client';

describe('ClientSortSelector', () => {
    test('renders the current sort field and order', () => {
        render(
            <ClientSortSelector
                sort={ClientSortField.CREATED}
                order="asc"
                onChangeOrder={() => {}}
                onChangeSort={() => {}}
            />,
        );

        expect(screen.getByText('дате создания')).toBeInTheDocument();
        expect(screen.getByText('возрастанию')).toBeInTheDocument();
    });

    test('calls onChangeSort when a new sort field is picked', async () => {
        const onChangeSort = jest.fn();
        render(
            <ClientSortSelector
                sort={ClientSortField.CREATED}
                order="asc"
                onChangeOrder={() => {}}
                onChangeSort={onChangeSort}
            />,
        );

        fireEvent.click(screen.getByText('дате создания'));
        fireEvent.click(await screen.findByText('по имени'));

        expect(onChangeSort).toHaveBeenCalledWith(ClientSortField.TITLE);
    });

    test('calls onChangeOrder when a new order is picked', async () => {
        const onChangeOrder = jest.fn();
        render(
            <ClientSortSelector
                sort={ClientSortField.CREATED}
                order="asc"
                onChangeOrder={onChangeOrder}
                onChangeSort={() => {}}
            />,
        );

        fireEvent.click(screen.getByText('возрастанию'));
        fireEvent.click(await screen.findByText('убыванию'));

        expect(onChangeOrder).toHaveBeenCalledWith('desc');
    });
});
