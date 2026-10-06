import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import AddClientForm from './ClientForm';

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
                <AddClientForm onSuccess={onSuccess} reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/company/branches') return Promise.resolve({ data: [] });
        if (url === '/schedule/groups') return Promise.resolve({ data: { data: [] } });
        if (url === '/mollie/customers') return Promise.resolve({ data: { items: [] } });
        return Promise.resolve({ data: [] });
    });
});

describe('AddClientForm', () => {
    test('renders the client card fields', () => {
        renderForm();
        expect(screen.getByPlaceholderText('Имя')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
    });

    test('shows a validation error when neither first nor last name is filled', async () => {
        renderForm();

        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        expect(await screen.findByText('Укажите имя или фамилию ученика')).toBeInTheDocument();
    });

    test('shows a validation error for an invalid email', async () => {
        renderForm();

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.change(screen.getByPlaceholderText('example@gmail.com'), { target: { value: 'not-an-email' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        expect(await screen.findByText('Введите корректный email или оставьте поле пустым')).toBeInTheDocument();
    });

    test('submits successfully and calls onSuccess/reloadPage', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        const { onSuccess, reloadPage } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Ученик успешно добавлен');
    });

    test('shows an error toast when submission fails', async () => {
        ($apiPrivate.post as jest.Mock).mockRejectedValue(new Error('network error'));
        const { onSuccess } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Не удалось добавить ученика'));
        expect(onSuccess).not.toHaveBeenCalled();
    });

    test('shows the branch groups once a branch with active groups is selected', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/company/branches') return Promise.resolve({ data: [{ id: 1, name: 'Central', isActive: true }] });
            if (url === '/schedule/groups') return Promise.resolve({
                data: { data: [{ id: 10, name: 'Group A', style: 'Hip-Hop', level: 'Start', branchId: 1 }] },
            });
            if (url === '/mollie/customers') return Promise.resolve({ data: { items: [] } });
            return Promise.resolve({ data: [] });
        });
        renderForm();

        // The Select component doesn't associate its visible label with the
        // <select> via htmlFor/id, so it isn't queryable by accessible name —
        // the branch select is the first <select> rendered in the form.
        const branchSelect = await screen.findByRole('option', { name: 'Central' });
        fireEvent.change(branchSelect.closest('select')!, { target: { value: '1' } });

        expect(await screen.findByText('Group A')).toBeInTheDocument();
    });
});
