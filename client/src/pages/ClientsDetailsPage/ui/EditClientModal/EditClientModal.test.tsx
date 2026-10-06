import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { EditClientModal } from './EditClientModal';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const client = {
    firstName: 'Ivan',
    lastName: 'Petrov',
    email: 'ivan@example.com',
    branchId: 1,
    groupMemberships: [],
};
const branches = [{ id: 1, name: 'Center', isActive: true }];
const groups = { data: [{ id: 10, name: 'Ballet', style: 'Ballet', level: 'Start', branchId: 1 }] };

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/clients/1') return Promise.resolve({ data: client });
        if (url === '/company/branches') return Promise.resolve({ data: branches });
        if (url === '/schedule/groups') return Promise.resolve({ data: groups });
        return Promise.resolve({ data: {} });
    });
});

function renderModal(props: Partial<React.ComponentProps<typeof EditClientModal>> = {}) {
    return render(
        <EditClientModal
            clientId="1"
            isOpen
            onClose={jest.fn()}
            onSuccess={jest.fn()}
            {...props}
        />,
    );
}

describe('EditClientModal', () => {
    test('loads and displays the client data', async () => {
        renderModal();

        expect(await screen.findByDisplayValue('Ivan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Petrov')).toBeInTheDocument();
        expect(screen.getByDisplayValue('ivan@example.com')).toBeInTheDocument();
    });

    test('shows a validation error and does not submit when both names are empty', async () => {
        renderModal();
        await screen.findByDisplayValue('Ivan');

        fireEvent.change(screen.getByDisplayValue('Ivan'), { target: { value: '' } });
        fireEvent.change(screen.getByDisplayValue('Petrov'), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        expect(await screen.findByText('Укажите имя или фамилию')).toBeInTheDocument();
        expect($apiPrivate.put).not.toHaveBeenCalled();
    });

    test('saves the updated client data', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({ data: client });
        const onSuccess = jest.fn();
        const onClose = jest.fn();
        renderModal({ onSuccess, onClose });
        await screen.findByDisplayValue('Ivan');

        fireEvent.change(screen.getByDisplayValue('Ivan'), { target: { value: 'Sergey' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        await waitFor(() => expect($apiPrivate.put).toHaveBeenCalledWith(
            '/clients/1',
            expect.any(FormData),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        ));
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when cancel is clicked', async () => {
        const onClose = jest.fn();
        renderModal({ onClose });
        await screen.findByDisplayValue('Ivan');

        fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
