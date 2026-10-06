import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { AddHallModal } from './AddHallModal';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { post: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('AddHallModal', () => {
    test('rejects saving without a name', () => {
        render(<AddHallModal isOpen onClose={() => {}} onSaved={() => {}} />);

        fireEvent.click(screen.getByText('Добавить'));

        expect(toast.error).toHaveBeenCalledWith('Введите название зала');
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('creates a hall with name and capacity', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({});
        const onSaved = jest.fn();
        const onClose = jest.fn();
        render(<AddHallModal isOpen onClose={onClose} onSaved={onSaved} />);

        fireEvent.change(screen.getByPlaceholderText('White'), { target: { value: 'Blue' } });
        fireEvent.change(screen.getByPlaceholderText('20'), { target: { value: '15' } });
        fireEvent.click(screen.getByText('Добавить'));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect($apiPrivate.post).toHaveBeenCalledWith('/schedule/halls', { name: 'Blue', capacity: '15' });
        expect(onClose).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Зал добавлен');
    });
});
