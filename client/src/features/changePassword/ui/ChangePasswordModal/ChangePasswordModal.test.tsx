import { Provider } from 'react-redux';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { ChangePasswordModal } from './ChangePasswordModal';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderModal(onClose = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        onClose,
        ...render(
            <Provider store={store}>
                <ChangePasswordModal isOpen onClose={onClose} profileId="1" />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ChangePasswordModal', () => {
    test('renders the three password fields', () => {
        renderModal();
        expect(screen.getByPlaceholderText('Текущий пароль')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Новый пароль')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Подтвердите новый пароль')).toBeInTheDocument();
    });

    test('shows a validation error when required fields are missing', async () => {
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        expect(await screen.findByText('Заполните все поля')).toBeInTheDocument();
    });

    test('shows a mismatch error when passwords do not match', async () => {
        renderModal();

        fireEvent.change(screen.getByPlaceholderText('Текущий пароль'), { target: { value: 'old' } });
        fireEvent.change(screen.getByPlaceholderText('Новый пароль'), { target: { value: 'new1' } });
        fireEvent.change(screen.getByPlaceholderText('Подтвердите новый пароль'), { target: { value: 'new2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument();
    });

    test('shows a success message and closes after a successful change', async () => {
        jest.useFakeTimers({ legacyFakeTimers: false });
        ($apiPrivate.put as jest.Mock).mockResolvedValue({});
        const { onClose } = renderModal();

        fireEvent.change(screen.getByPlaceholderText('Текущий пароль'), { target: { value: 'old' } });
        fireEvent.change(screen.getByPlaceholderText('Новый пароль'), { target: { value: 'new123' } });
        fireEvent.change(screen.getByPlaceholderText('Подтвердите новый пароль'), { target: { value: 'new123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        expect(await screen.findByText('Пароль успешно изменён')).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(1500);
        });
        expect(onClose).toHaveBeenCalled();

        jest.useRealTimers();
    });

    test('shows a "current password incorrect" error on a 400 response', async () => {
        ($apiPrivate.put as jest.Mock).mockRejectedValue(
            Object.assign(new Error('bad'), { isAxiosError: true, response: { status: 400 } }),
        );
        renderModal();

        fireEvent.change(screen.getByPlaceholderText('Текущий пароль'), { target: { value: 'wrong' } });
        fireEvent.change(screen.getByPlaceholderText('Новый пароль'), { target: { value: 'new123' } });
        fireEvent.change(screen.getByPlaceholderText('Подтвердите новый пароль'), { target: { value: 'new123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        expect(await screen.findByText('Текущий пароль неверный')).toBeInTheDocument();
    });
});
