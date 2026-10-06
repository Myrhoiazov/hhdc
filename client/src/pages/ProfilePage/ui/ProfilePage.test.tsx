import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { userActions } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { $apiPrivate } from '@/shared/api/api';
import ProfilePage from './ProfilePage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

function renderPage(id = '1', authId = '1') {
    const baseStore = createReduxStore() as ReduxStoreWithManager;
    baseStore.dispatch(userActions.setAuthData({
        id: authId, username: 'denis', email: 'd@example.com', role: RoleKey.MANAGER,
    }));

    return render(
        <Provider store={baseStore}>
            <MemoryRouter initialEntries={[`/profile/${id}`]}>
                <Routes>
                    <Route path="/profile/:id" element={<ProfilePage />} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

describe('ProfilePage', () => {
    test('fetches and renders the profile for the given id', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/users/1') return Promise.resolve({ data: { id: '1', firstName: 'Ivan', lastName: 'Petrov', role: RoleKey.MANAGER } });
            if (url === '/profile/sessions') return Promise.resolve({ data: { data: [] } });
            return Promise.resolve({ data: {} });
        });

        renderPage('1');

        expect(await screen.findByDisplayValue('Ivan')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/users/1');
    });

    test('renders active sessions only for your own profile', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/users/1') return Promise.resolve({ data: { id: '1', firstName: 'Ivan', lastName: 'Petrov', role: RoleKey.MANAGER } });
            if (url === '/profile/sessions') return Promise.resolve({ data: { data: [] } });
            return Promise.resolve({ data: {} });
        });

        renderPage('1', '1');

        expect(await screen.findByText('Активные сессии')).toBeInTheDocument();
    });

    test('does not render active sessions for someone else\'s profile', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: { id: '2', firstName: 'Petr', lastName: 'Ivanov', role: RoleKey.MANAGER },
        });

        renderPage('2', '1');

        await screen.findByDisplayValue('Petr');
        expect(screen.queryByText('Активные сессии')).not.toBeInTheDocument();
    });
});
