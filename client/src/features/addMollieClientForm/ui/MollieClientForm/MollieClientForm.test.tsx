import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import MollieClientForm from './MollieClientForm';

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
                <MollieClientForm onSuccess={onSuccess} reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('MollieClientForm', () => {
    test('renders the card fields', () => {
        renderForm();
        expect(screen.getByPlaceholderText('Имя')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Фамилия')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('example@gmail.com')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('cst_bhiubi')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Consumer Name')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Consumer Account')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Consumer Bic')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Deventer')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
    });

    test('updates the first name field through the redux store', () => {
        renderForm();
        const input = screen.getByPlaceholderText('Имя');

        fireEvent.change(input, { target: { value: 'Ivan' } });

        expect(input).toHaveValue('Ivan');
    });

    test('rejects an empty form without calling the API', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        renderForm();

        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('calls onSuccess and shows a success toast after saving a filled form', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        const { onSuccess, reloadPage } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.change(screen.getByPlaceholderText('Фамилия'), { target: { value: 'Petrov' } });
        fireEvent.change(screen.getByPlaceholderText('example@gmail.com'), { target: { value: 'ivan@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Клиент успешно добавлен');
    });

    test('does not call onSuccess when saving fails', async () => {
        ($apiPrivate.post as jest.Mock).mockRejectedValue(new Error('network error'));
        const { onSuccess } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onSuccess).not.toHaveBeenCalled();
    });
});
