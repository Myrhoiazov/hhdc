import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { UserFilters } from './UserFilters';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderFilters() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <UserFilters />
            </MemoryRouter>
        </Provider>,
    );
}

describe('UserFilters', () => {
    test('renders the create-user button', () => {
        renderFilters();
        expect(screen.getByRole('button', { name: /Создать пользователя/ })).toBeInTheDocument();
    });

    test('opens the create-user modal when the button is clicked', async () => {
        renderFilters();
        fireEvent.click(screen.getByRole('button', { name: /Создать пользователя/ }));

        expect(await screen.findByText('Добавление нового сотрудника')).toBeInTheDocument();
    });
});
