import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { userActions } from '@/entities/User';
import { AvatarDropdown } from './AvatarDropdown';
import { RoleKey } from '@/entities/Role';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderWithAuth(authData?: { id: string; username: string; email: string; role: RoleKey }) {
    const store = createReduxStore() as ReduxStoreWithManager;
    if (authData) {
        store.dispatch(userActions.setAuthData(authData));
    }
    return {
        store,
        ...render(
            <Provider store={store}>
                <MemoryRouter>
                    <AvatarDropdown />
                </MemoryRouter>
            </Provider>,
        ),
    };
}

describe('AvatarDropdown', () => {
    test('renders nothing when there is no authenticated user', () => {
        const { container } = renderWithAuth();
        expect(container).toBeEmptyDOMElement();
    });

    test('renders the menu with Settings, Profile, and Logout once authenticated', async () => {
        renderWithAuth({ id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN });

        fireEvent.click(screen.getByRole('button'));

        expect(await screen.findByText('Настройки')).toBeInTheDocument();
        expect(screen.getByText('Профиль')).toBeInTheDocument();
        expect(screen.getByText('Выйти')).toBeInTheDocument();
    });

    test('dispatches logout when "Выйти" is clicked', async () => {
        const { store } = renderWithAuth({ id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN });

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Выйти'));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(store.getState().user.authData).toBeUndefined();
    });
});
