import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { ClientFilters } from './ClientFilters';
import { ClientSortField } from '@/entities/Client';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: {
        get: jest.fn().mockImplementation((url: string) => {
            if (url === '/schedule/groups') return Promise.resolve({ data: { data: [] } });
            if (url === '/mollie/customers') return Promise.resolve({ data: { items: [] } });
            return Promise.resolve({ data: [] });
        }),
        post: jest.fn(),
    },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderFilters(props: Partial<React.ComponentProps<typeof ClientFilters>> = {}) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ClientFilters
                    search=""
                    sort={ClientSortField.CREATED}
                    order="asc"
                    onChangeSearch={() => {}}
                    onChangeOrder={() => {}}
                    onChangeSort={() => {}}
                    {...props}
                />
            </MemoryRouter>
        </Provider>,
    );
}

describe('ClientFilters', () => {
    test('renders the search input and add-client button', () => {
        renderFilters();
        expect(screen.getByPlaceholderText('Поиск')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Добавить клиента/ })).toBeInTheDocument();
    });

    test('calls onChangeSearch when the search input changes', () => {
        const onChangeSearch = jest.fn();
        renderFilters({ onChangeSearch });

        fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'Ivan' } });

        expect(onChangeSearch).toHaveBeenCalledWith('Ivan');
    });

    test('opens the add-client modal when the button is clicked', async () => {
        renderFilters();
        fireEvent.click(screen.getByRole('button', { name: /Добавить клиента/ }));

        expect(await screen.findByText('Добавление ученика', {}, { timeout: 3000 })).toBeInTheDocument();
    });
});
