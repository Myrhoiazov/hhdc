import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import AddMollieSubscriptionForm from './AddMollieSubscriptionForm';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
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
                <AddMollieSubscriptionForm onSuccess={onSuccess} reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [] });
});

describe('AddMollieSubscriptionForm', () => {
    test('renders the subscription card once customers have loaded', async () => {
        renderForm();
        expect(await screen.findByRole('button', { name: 'Добавить' })).toBeInTheDocument();
    });

    test('rejects an empty form without calling the API', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: 'sub_1' } });
        renderForm();

        fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('calls onSuccess and shows a success toast after saving a filled form', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: 'sub_1' } });
        const { onSuccess, reloadPage } = renderForm();

        // any field edit is enough to make the form non-empty and pass validation
        fireEvent.change(await screen.findByPlaceholderText('1 month, 14 days'), { target: { value: '1 month' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Подписка оформленна');
    });
});
