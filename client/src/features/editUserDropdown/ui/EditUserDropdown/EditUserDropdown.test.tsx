import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { EditUserDropdown } from './EditUserDropdown';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { delete: jest.fn(), patch: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

function renderDropdown(props: Partial<React.ComponentProps<typeof EditUserDropdown>> = {}) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <EditUserDropdown userId="1" isEnabled {...props} />
            </MemoryRouter>
        </Provider>,
    );
}

describe('EditUserDropdown', () => {
    test('shows "Заблокировать вход" when the account is enabled', async () => {
        renderDropdown({ isEnabled: true });
        fireEvent.click(screen.getByRole('button'));
        expect(await screen.findByText('Заблокировать вход')).toBeInTheDocument();
    });

    test('shows "Разблокировать вход" when the account is disabled', async () => {
        renderDropdown({ isEnabled: false });
        fireEvent.click(screen.getByRole('button'));
        expect(await screen.findByText('Разблокировать вход')).toBeInTheDocument();
    });

    test('toggles the account status', async () => {
        ($apiPrivate.patch as jest.Mock).mockResolvedValue({ data: {} });
        renderDropdown({ isEnabled: true });

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Заблокировать вход'));

        await screen.findByText('Заблокировать вход');
        expect($apiPrivate.patch).toHaveBeenCalledWith('/users/1', { isEnabled: false });
        expect(toast.success).toHaveBeenCalledWith('Аккаунт заблокирован');
    });

    test('deletes the user', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({ data: {} });
        renderDropdown();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Удалить'));

        await screen.findByText('Удалить');
        expect(toast.info).toHaveBeenCalledWith('Пользователь успешно удален');
    });
});
