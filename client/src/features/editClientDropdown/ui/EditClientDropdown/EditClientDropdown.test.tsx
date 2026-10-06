import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { EditClientDropdown } from './EditClientDropdown';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

function renderDropdown(props: Partial<React.ComponentProps<typeof EditClientDropdown>> = {}) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <EditClientDropdown clientId="1" {...props} />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('EditClientDropdown', () => {
    test('shows the mollie item as disabled when there is no linked account', async () => {
        renderDropdown();
        fireEvent.click(screen.getByRole('button'));

        const mollieButton = (await screen.findByText('Mollie аккаунт не привязан')).closest('button');
        expect(mollieButton).toBeDisabled();
    });

    test('links to the mollie account when linked', async () => {
        renderDropdown({ mollieCustomerId: 5 });
        fireEvent.click(screen.getByRole('button'));

        const link = (await screen.findByText('Mollie аккаунт')).closest('a');
        expect(link).toHaveAttribute('href', expect.stringContaining('5'));
    });

    test('deletes the client and reloads the page on success', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({ data: {} });
        const reloadPage = jest.fn();
        renderDropdown({ reloadPage });

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Удалить'));

        await screen.findByText('Удалить');
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Клиент успешно удален');
    });

    test('does not reload the page when deletion fails', async () => {
        ($apiPrivate.delete as jest.Mock).mockRejectedValue(new Error('network error'));
        const reloadPage = jest.fn();
        renderDropdown({ reloadPage });

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(await screen.findByText('Удалить'));

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(reloadPage).not.toHaveBeenCalled();
    });
});
