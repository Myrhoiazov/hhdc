import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import UserForm from './UserForm';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function renderForm(onSuccess = jest.fn(), reloadPage = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        onSuccess,
        reloadPage,
        ...render(
            <Provider store={store}>
                <UserForm onSuccess={onSuccess} reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('UserForm', () => {
    test('renders the user card fields', () => {
        renderForm();
        expect(screen.getByPlaceholderText('Ваше Имя')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
    });

    test('updates the first name field through the redux store', () => {
        renderForm();
        const input = screen.getByPlaceholderText('Ваше Имя');

        fireEvent.change(input, { target: { value: 'Ivan' } });

        expect(input).toHaveValue('Ivan');
    });

    test('calls onSuccess and reloads the page after a successful save', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        const { onSuccess, reloadPage } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('Ваше Имя'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await screen.findByRole('button', { name: 'Добавить' });
        expect(onSuccess).toHaveBeenCalled();
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Пользователь успешно добавлен');
    });

    test('does not call onSuccess when the save fails', async () => {
        ($apiPrivate.post as jest.Mock).mockRejectedValue(new Error('network error'));
        const { onSuccess } = renderForm();

        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onSuccess).not.toHaveBeenCalled();
    });
});
