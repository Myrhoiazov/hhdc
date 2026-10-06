import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import SettingsPage from './SettingsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const users = [
    { id: '1', firstName: 'Ivan', lastName: 'Petrov', email: 'ivan@example.com', role: 'ADMIN', isEnabled: true },
];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: users });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('SettingsPage', () => {
    test('renders the loaded users list', async () => {
        renderPage();
        expect(await screen.findByText(/Ivan Petrov/)).toBeInTheDocument();
    });

    test('re-fetches the users list when a user is deleted', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({ data: {} });
        renderPage();
        await screen.findByText(/Ivan Petrov/);
        ($apiPrivate.get as jest.Mock).mockClear();

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[buttons.length - 1]);
        fireEvent.click(await screen.findByText('Удалить'));

        await waitFor(() => expect($apiPrivate.get).toHaveBeenCalled());
    });
});
