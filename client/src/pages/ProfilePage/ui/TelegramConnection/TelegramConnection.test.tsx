import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { TelegramConnection } from './TelegramConnection';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('TelegramConnection', () => {
    test('shows a "connect" action when nothing is linked', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { linked: false } });
        render(<TelegramConnection />);

        expect(await screen.findByText('Подключить Telegram')).toBeInTheDocument();
        expect(screen.getByText('Не подключён')).toBeInTheDocument();
    });

    test('shows the linked identity and a disconnect action', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: {
                linked: true,
                username: 'ada',
                displayName: 'Ada Lovelace',
                linkedAt: '2026-09-19T10:00:00Z',
                lastLoginAt: null,
            },
        });
        render(<TelegramConnection />);

        expect(await screen.findByText('Подключён')).toBeInTheDocument();
        expect(screen.getByText('@ada')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Отключить Telegram' })).toBeInTheDocument();
    });

    test('disconnects after confirmation and flips the card back to "not connected"', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { linked: true, username: 'ada' } });
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        render(<TelegramConnection />);

        fireEvent.click(await screen.findByRole('button', { name: 'Отключить Telegram' }));

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/auth/telegram/link'));
        expect(await screen.findByText('Не подключён')).toBeInTheDocument();
    });

    test('does not disconnect when the confirmation is declined', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { linked: true, username: 'ada' } });
        jest.spyOn(window, 'confirm').mockReturnValue(false);
        render(<TelegramConnection />);

        fireEvent.click(await screen.findByRole('button', { name: 'Отключить Telegram' }));

        expect($apiPrivate.delete).not.toHaveBeenCalled();
    });

    test('shows an error state when the status fetch fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));
        render(<TelegramConnection />);

        expect(await screen.findByText('Не удалось загрузить статус подключения Telegram.')).toBeInTheDocument();
    });
});
