import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { EditTransactionDropdown } from './EditTransactionDropdown';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

function renderDropdown(reloadPage = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        reloadPage,
        ...render(
            <Provider store={store}>
                <EditTransactionDropdown transactionId="1" reloadPage={reloadPage} />
            </Provider>,
        ),
    };
}

describe('EditTransactionDropdown', () => {
    test('deletes the transaction and reloads the page on success', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({ data: {} });
        const { reloadPage } = renderDropdown();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Удалить'));

        await screen.findByText('Удалить');
        expect($apiPrivate.delete).toHaveBeenCalledWith('/transactions/1');
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Транзакция успешно удалена');
    });
});
