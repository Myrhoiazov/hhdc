import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { EditMollieClientDropdown } from './EditMollieClientDropdown';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), delete: jest.fn(), put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function renderDropdown(reloadPage = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        reloadPage,
        ...render(
            <Provider store={store}>
                <MemoryRouter>
                    <EditMollieClientDropdown clientId="1" reloadPage={reloadPage} />
                </MemoryRouter>
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('EditMollieClientDropdown', () => {
    test('renders the dropdown menu items', async () => {
        renderDropdown();
        fireEvent.click(screen.getByRole('button'));

        expect(await screen.findByText('Просмотреть')).toBeInTheDocument();
        expect(screen.getByText('Обновить')).toBeInTheDocument();
        expect(screen.getByText('Удалить')).toBeInTheDocument();
    });

    test('deletes the client and reloads the page', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({ data: {} });
        const { reloadPage } = renderDropdown();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Удалить'));

        await screen.findByText('Удалить');
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Клиент успешно удален');
    });

    test('opens the edit modal and fetches the client data on "Обновить"', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { id: '1', givenName: 'Ivan' } });
        renderDropdown();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Обновить'));

        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/edit-data/1');
        expect(await screen.findByText('Редактирование клиента', {}, { timeout: 3000 })).toBeInTheDocument();
    });
});
