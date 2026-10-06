import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { ActiveSessions } from './ActiveSessions';

jest.mock('@/shared/api/api', () => ({
    $api: { post: jest.fn() },
    $apiPrivate: { get: jest.fn(), delete: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const sessions = [
    { id: 1, ipAddress: '1.2.3.4', userAgent: 'Chrome Mac OS X', createdAt: '2026-01-01', expiresAt: '2026-02-01', isCurrent: true },
    { id: 2, ipAddress: '5.6.7.8', userAgent: 'Firefox Windows', createdAt: '2026-01-02', expiresAt: '2026-02-02', isCurrent: false },
];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { data: sessions } });
});

function renderComponent() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return { store, ...render(<Provider store={store}><ActiveSessions /></Provider>) };
}

describe('ActiveSessions', () => {
    test('renders each session with its device and current badge', async () => {
        renderComponent();
        expect(await screen.findByText('Chrome · macOS')).toBeInTheDocument();
        expect(screen.getByText('Текущая')).toBeInTheDocument();
        expect(screen.getByText('Firefox · Windows')).toBeInTheDocument();
    });

    test('shows an empty state when there are no sessions', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
        renderComponent();
        expect(await screen.findByText('Активных сессий не найдено')).toBeInTheDocument();
    });

    test('revokes a non-current session and reloads the list', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        renderComponent();
        await screen.findByText('Firefox · Windows');

        fireEvent.click(screen.getByRole('button', { name: 'Завершить' }));

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/profile/sessions/2'));
    });

    test('logs out locally when revoking the current session', async () => {
        const { store } = renderComponent();
        await screen.findByText('Chrome · macOS');

        fireEvent.click(screen.getByRole('button', { name: 'Выйти здесь' }));

        expect($apiPrivate.delete).not.toHaveBeenCalledWith('/profile/sessions/1');
        await waitFor(() => expect(store.getState().user.authData).toBeUndefined());
    });

    test('disables "Завершить остальные" when there are no other sessions', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { data: [sessions[0]] } });
        renderComponent();
        await screen.findByText('Chrome · macOS');

        expect(screen.getByRole('button', { name: 'Завершить остальные' })).toBeDisabled();
    });
});
