import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { $apiPrivate } from '@/shared/api/api';
import { mollieClientActions, mollieClientReducer } from '../../model/slices/mollieClientSlice';
import MollieClientForm from './MollieClientForm';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const reducers: ReducersList = { mollieClientForm: mollieClientReducer };

function renderForm(onSuccess = jest.fn(), reloadPage = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>
            <DynamicModuleLoader reducers={reducers}>{children}</DynamicModuleLoader>
        </Provider>
    );
    return {
        onSuccess,
        reloadPage,
        store,
        ...render(<MollieClientForm onSuccess={onSuccess} reloadPage={reloadPage} clientId="1" />, { wrapper }),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('MollieClientForm (edit)', () => {
    test('shows the "editing" title when a clientId is given', () => {
        renderForm();
        expect(screen.getByText('Редактирование клиента')).toBeInTheDocument();
    });

    test('rejects without calling the API when the form has no id', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        renderForm();

        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect($apiPrivate.put).not.toHaveBeenCalled();
    });

    test('calls onSuccess and shows a success toast after saving a loaded client', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({ data: { id: '1' } });
        const { onSuccess, reloadPage, store } = renderForm();

        // Simulates the id the parent EditMollieClientDropdown normally loads via
        // fetchMollieClientData before the modal opens.
        act(() => {
            store.dispatch(mollieClientActions.updateProfile({ id: '1' }));
        });
        fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Ivan' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Клиент успешно обновлен');
    });
});
