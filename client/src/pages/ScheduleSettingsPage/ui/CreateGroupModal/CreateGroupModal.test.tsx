import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { CreateGroupModal } from './CreateGroupModal';
import { DanceGroup } from '@/entities/DanceGroup';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/schedule/choreographers') return Promise.resolve({ data: [{ id: 1, firstName: 'Ivan', lastName: 'Petrov' }] });
        if (url === '/company/branches') return Promise.resolve({ data: [{ id: 1, name: 'Central' }] });
        if (url === '/schedule/styles') return Promise.resolve({ data: ['Breakdance'] });
        return Promise.resolve({ data: [] });
    });
});

describe('CreateGroupModal', () => {
    test('renders the create title with a default slot row', async () => {
        render(<CreateGroupModal isOpen onClose={() => {}} onSaved={() => {}} />);
        expect(screen.getByText('СОЗДАТЬ ГРУППУ')).toBeInTheDocument();
        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
    });

    test('prefills fields when editing a group', async () => {
        const group: DanceGroup = {
            id: 1,
            name: 'Break dance',
            style: 'Breakdance',
            level: 'PRO',
            maxParticipants: 20,
            lessonPriceCents: 1500,
            choreographerId: 1,
            choreographer: { id: 1, firstName: 'Ivan', lastName: 'Petrov' },
            slots: [{ dayOfWeek: 'Понедельник', startTime: '10:00', endTime: '11:00' }],
            createdAt: '2026-01-01',
        };
        render(<CreateGroupModal isOpen onClose={() => {}} onSaved={() => {}} editGroup={group} />);
        await screen.findByText('Ivan Petrov');

        expect(screen.getByText('РЕДАКТИРОВАТЬ ГРУППУ')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Break dance')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15.00')).toBeInTheDocument();
    });

    test('rejects saving without the required fields', async () => {
        render(<CreateGroupModal isOpen onClose={() => {}} onSaved={() => {}} />);
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByText('Создать'));

        expect(toast.error).toHaveBeenCalledWith('Заполните все обязательные поля');
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('adds and removes schedule slots', async () => {
        render(<CreateGroupModal isOpen onClose={() => {}} onSaved={() => {}} />);
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getByText('+ Добавить слот'));
        expect(screen.getAllByText('×')).toHaveLength(2);

        fireEvent.click(screen.getAllByText('×')[0]);
        expect(screen.queryAllByText('×')).toHaveLength(0);
    });

    test('creates a group once all required fields are filled', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({});
        const onSaved = jest.fn();
        render(<CreateGroupModal isOpen onClose={() => {}} onSaved={onSaved} />);
        await screen.findByText('Ivan Petrov');

        fireEvent.change(screen.getByPlaceholderText('Break dance 6-10 років'), { target: { value: 'New Group' } });
        fireEvent.change(screen.getByDisplayValue('Выберите хореографа'), { target: { value: '1' } });
        fireEvent.change(screen.getByDisplayValue('Выберите стиль'), { target: { value: 'Breakdance' } });
        fireEvent.change(screen.getByDisplayValue('Выберите филиал'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Создать'));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect($apiPrivate.post).toHaveBeenCalledWith('/schedule/groups', expect.objectContaining({ name: 'New Group', style: 'Breakdance' }));
        expect(toast.success).toHaveBeenCalledWith('Группа создана');
    });
});
