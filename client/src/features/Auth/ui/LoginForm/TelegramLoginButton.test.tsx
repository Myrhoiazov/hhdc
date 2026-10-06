import { render, screen, waitFor } from '@testing-library/react';
import { $api } from '@/shared/api/api';
import { TelegramLoginButton } from './TelegramLoginButton';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
}));

const mockedGet = $api.get as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('TelegramLoginButton', () => {
    test('renders nothing while /auth/providers is loading or reports telegram disabled', async () => {
        mockedGet.mockResolvedValueOnce({ data: { telegram: false } });
        render(<TelegramLoginButton />);

        expect(screen.queryByText('Войти через Telegram')).not.toBeInTheDocument();
        await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/auth/providers'));
        expect(screen.queryByText('Войти через Telegram')).not.toBeInTheDocument();
    });

    test('renders the button once /auth/providers reports telegram enabled', async () => {
        mockedGet.mockResolvedValueOnce({ data: { telegram: true } });
        render(<TelegramLoginButton />);

        expect(await screen.findByText('Войти через Telegram')).toBeInTheDocument();
    });

    test('stays hidden if /auth/providers fails, rather than throwing', async () => {
        mockedGet.mockRejectedValueOnce(new Error('network error'));
        render(<TelegramLoginButton />);

        await waitFor(() => expect(mockedGet).toHaveBeenCalled());
        expect(screen.queryByText('Войти через Telegram')).not.toBeInTheDocument();
    });
});
