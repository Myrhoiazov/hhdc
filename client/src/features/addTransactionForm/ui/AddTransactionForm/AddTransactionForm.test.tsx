import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import AddTransactionForm from './AddTransactionForm';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderForm(onSuccess = jest.fn(), reloadPage = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        onSuccess,
        reloadPage,
        ...render(
            <Provider store={store}>
                <AddTransactionForm onSuccess={onSuccess} reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('AddTransactionForm', () => {
    test('renders the transaction card and submit button', () => {
        renderForm();
        expect(screen.getByPlaceholderText('100.00')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
    });

    test('updates the amount field through the redux store', () => {
        renderForm();
        const input = screen.getByPlaceholderText('100.00');

        fireEvent.change(input, { target: { value: '250.00' } });

        expect(input).toHaveValue('250.00');
    });

    test('rejects an empty form without calling the API', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        renderForm();

        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('calls onSuccess and reloadPage after saving a filled form', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        const { onSuccess, reloadPage } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('100.00'), { target: { value: '250.00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(reloadPage).toHaveBeenCalled();
    });

    test('does not call onSuccess when saving fails', async () => {
        ($apiPrivate.post as jest.Mock).mockRejectedValue(new Error('network error'));
        const { onSuccess } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('100.00'), { target: { value: '250.00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onSuccess).not.toHaveBeenCalled();
    });
});
