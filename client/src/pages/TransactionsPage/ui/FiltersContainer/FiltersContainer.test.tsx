import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore } from '@/app/providers/StoreProvider';
import { transactionsPageReducer } from '../../model/slices/transactionsPageSlice';
import { FiltersContainer } from './FiltersContainer';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(() => new Promise(() => {})), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderContainer(reloadPage = jest.fn()) {
    const store = createReduxStore(undefined, { transactionPage: transactionsPageReducer } as never);
    return { store, ...render(<Provider store={store}><FiltersContainer reloadPage={reloadPage} /></Provider>) };
}

describe('FiltersContainer', () => {
    test('renders the search input and transaction type tabs', () => {
        renderContainer();

        expect(screen.getByPlaceholderText('Поиск')).toBeInTheDocument();
    });

    test('typing in the search input updates the store search filter', () => {
        const { store } = renderContainer();

        fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'rent' } });

        expect(store.getState().transactionPage!.search).toBe('rent');
    });
});
