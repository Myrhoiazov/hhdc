import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import CrmSettingsPage from './CrmSettingsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <CrmSettingsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('CrmSettingsPage', () => {
    test('shows "not connected" status', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: { source: 'none', isConnected: false, connectedByCurrentUser: false },
        });
        renderPage();

        expect(await screen.findByText('Не подключено')).toBeInTheDocument();
    });

    test('shows the OAuth-connected status and expiry details', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: {
                source: 'oauth',
                isConnected: true,
                connectedByCurrentUser: true,
                expiresAt: '2026-02-01T00:00:00.000Z',
            },
        });
        renderPage();

        expect(await screen.findByText('OAuth подключён')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Отключить OAuth' })).toBeInTheDocument();
    });

    test('shows an error card when the status request fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));
        renderPage();

        expect(await screen.findByText('Не удалось загрузить статус Mollie')).toBeInTheDocument();
    });

    test('disconnects after confirmation', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: { source: 'oauth', isConnected: true, connectedByCurrentUser: true },
        });
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { fallback: 'api_key' } });
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();

        fireEvent.click(await screen.findByRole('button', { name: 'Отключить OAuth' }));

        expect(await screen.findByText('Используется API key')).toBeInTheDocument();
    });
});
