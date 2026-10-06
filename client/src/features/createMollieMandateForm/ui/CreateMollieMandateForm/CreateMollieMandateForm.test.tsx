import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import CreateMollieMandateForm from './CreateMollieMandateForm';

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
                <CreateMollieMandateForm onSuccess={onSuccess} reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [] });
});

describe('CreateMollieMandateForm', () => {
    test('renders the mandate card once customers have loaded', async () => {
        renderForm();
        expect(await screen.findByRole('button', { name: 'Добавить' })).toBeInTheDocument();
    });

    test('rejects an empty form without calling the API', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: 'mnd_1' } });
        renderForm();

        fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('calls onSuccess and shows a success toast after saving a filled form', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: 'mnd_1' } });
        const { onSuccess, reloadPage } = renderForm();

        const dateField = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(dateField, { target: { value: '2026-01-15' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Mandate успешно добавлен');
    });
});
