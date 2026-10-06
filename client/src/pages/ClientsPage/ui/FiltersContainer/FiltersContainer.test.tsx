import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore } from '@/app/providers/StoreProvider';
import { clientsPageReducer } from '../../model/slices/clientsPageSlice';
import { FiltersContainer } from './FiltersContainer';

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

function renderContainer(reloadPage = jest.fn()) {
    const store = createReduxStore(undefined, { clientsPage: clientsPageReducer } as never);
    return {
        store,
        ...render(
            <Provider store={store}>
                <MemoryRouter>
                    <FiltersContainer reloadPage={reloadPage} />
                </MemoryRouter>
            </Provider>,
        ),
    };
}

describe('FiltersContainer', () => {
    test('renders the search input and payment status filter', async () => {
        renderContainer();

        expect(screen.getByPlaceholderText('Поиск')).toBeInTheDocument();
        expect(screen.getByText('Оплата')).toBeInTheDocument();
        // Flushes ClientTypeTabs' branches fetch so it doesn't settle after the test ends.
        await screen.findByText('Все филиалы');
    });

    test('typing in the search input updates the store search filter', async () => {
        const { store } = renderContainer();

        fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'ivan' } });

        expect(store.getState().clientsPage!.search).toBe('ivan');
        await screen.findByText('Все филиалы');
    });

    test('changing the payment status filter updates the store', async () => {
        const { store } = renderContainer();

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[selects.length - 1], { target: { value: 'payment_issue' } });

        expect(store.getState().clientsPage!.paymentStatus).toBe('payment_issue');
        await screen.findByText('Все филиалы');
    });
});
