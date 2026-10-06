import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { Navbar } from './Navbar';

jest.mock('@/entities/EmailMessage', () => ({
    fetchUnreadEmailCount: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderNavbar(role?: RoleKey) {
    const store = configureStore({
        reducer: { user: userReducer },
        preloadedState: {
            user: {
                _inited: true,
                authData: role ? { id: '1', username: 'denis', email: 'd@example.com', role } : undefined,
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        </Provider>,
    );
}

describe('Navbar', () => {
    test('renders nothing when there is no authenticated user', () => {
        const { container } = renderNavbar();
        expect(container).toBeEmptyDOMElement();
    });

    test('renders the add-client button when authenticated', () => {
        renderNavbar(RoleKey.MANAGER);
        expect(screen.getByText('Добавить клиента')).toBeInTheDocument();
    });

    test('shows the notification bell only for admins', () => {
        renderNavbar(RoleKey.ADMIN);
        expect(screen.getByLabelText('Непрочитанные письма')).toBeInTheDocument();
    });

    test('hides the notification bell for non-admins', () => {
        renderNavbar(RoleKey.MANAGER);
        expect(screen.queryByLabelText('Непрочитанные письма')).not.toBeInTheDocument();
    });

    test('renders a language button for each supported language', () => {
        renderNavbar(RoleKey.MANAGER);
        expect(screen.getByText('UA')).toBeInTheDocument();
        expect(screen.getByText('EN')).toBeInTheDocument();
        expect(screen.getByText('RU')).toBeInTheDocument();
    });
});
