import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { BranchModal } from './BranchModal';
import { Branch } from '../BranchCard/BranchCard';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { post: jest.fn(), put: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('BranchModal', () => {
    test('renders empty fields for a new branch', () => {
        render(<BranchModal isOpen onClose={() => {}} onSaved={() => {}} />);
        expect(screen.getByText('СОЗДАТЬ ФИЛИАЛ')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('DDC Центральный')).toHaveValue('');
    });

    test('prefills fields when editing a branch', () => {
        const branch: Branch = { id: 1, name: 'Central', city: 'Kyiv', isActive: true };
        render(<BranchModal isOpen onClose={() => {}} onSaved={() => {}} editBranch={branch} />);

        expect(screen.getByText('РЕДАКТИРОВАТЬ ФИЛИАЛ')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Central')).toBeInTheDocument();
    });

    test('rejects saving without a name', () => {
        render(<BranchModal isOpen onClose={() => {}} onSaved={() => {}} />);

        fireEvent.click(screen.getByText('Создать'));

        expect(toast.error).toHaveBeenCalledWith('Введите название филиала');
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('creates a new branch', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({});
        const onSaved = jest.fn();
        const onClose = jest.fn();
        render(<BranchModal isOpen onClose={onClose} onSaved={onSaved} />);

        fireEvent.change(screen.getByPlaceholderText('DDC Центральный'), { target: { value: 'New Branch' } });
        fireEvent.click(screen.getByText('Создать'));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect($apiPrivate.post).toHaveBeenCalledWith('/company/branches', expect.objectContaining({ name: 'New Branch' }));
        expect(onClose).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Филиал создан');
    });

    test('updates an existing branch', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({});
        const branch: Branch = { id: 1, name: 'Central', isActive: true };
        render(<BranchModal isOpen onClose={() => {}} onSaved={() => {}} editBranch={branch} />);

        fireEvent.click(screen.getByText('Сохранить'));

        await waitFor(() => expect($apiPrivate.put).toHaveBeenCalledWith('/company/branches/1', expect.objectContaining({ name: 'Central' })));
        expect(toast.success).toHaveBeenCalledWith('Филиал обновлён');
    });
});
