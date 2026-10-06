import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { profileReducer } from '@/entities/Profile';
import { RoleKey } from '@/entities/Role';
import { ProfilePageHeader } from './ProfilePageHeader';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderHeader({
    authId = '1',
    authRole = RoleKey.MANAGER,
    profileId = '1',
    readonly = true,
}: { authId?: string; authRole?: RoleKey; profileId?: string; readonly?: boolean } = {}) {
    const store = configureStore({
        reducer: { user: userReducer, profile: profileReducer },
        preloadedState: {
            user: { _inited: true, authData: { id: authId, username: 'denis', email: 'd@example.com', role: authRole } },
            profile: {
                isLoading: false,
                readonly,
                data: { id: profileId, firstName: 'Ivan', lastName: 'Petrov', role: RoleKey.MANAGER },
            },
        },
    });
    return { store, ...render(<Provider store={store}><ProfilePageHeader /></Provider>) };
}

describe('ProfilePageHeader', () => {
    test('renders the profile name and role badge', () => {
        renderHeader();
        expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByText('Менеджер')).toBeInTheDocument();
    });

    test('shows "Редактировать" for the profile owner', () => {
        renderHeader({ authId: '1', profileId: '1' });
        expect(screen.getByRole('button', { name: 'Редактировать' })).toBeInTheDocument();
    });

    test('hides edit actions for a manager viewing someone else\'s profile', () => {
        renderHeader({ authId: '1', authRole: RoleKey.MANAGER, profileId: '2' });
        expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument();
    });

    test('shows edit actions for an admin viewing another profile', () => {
        renderHeader({ authId: '1', authRole: RoleKey.ADMIN, profileId: '2' });
        expect(screen.getByRole('button', { name: 'Редактировать' })).toBeInTheDocument();
    });

    test('switches to Save/Cancel when editing', () => {
        renderHeader({ readonly: false });
        expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
    });

    test('dispatches setReadonly(false) when "Редактировать" is clicked', () => {
        const { store } = renderHeader();

        fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));

        expect(store.getState().profile.readonly).toBe(false);
    });

    test('opens the change-password modal for your own profile', () => {
        renderHeader({ authId: '1', profileId: '1', readonly: true });

        fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));

        expect(screen.getByPlaceholderText('Текущий пароль')).toBeInTheDocument();
    });
});
