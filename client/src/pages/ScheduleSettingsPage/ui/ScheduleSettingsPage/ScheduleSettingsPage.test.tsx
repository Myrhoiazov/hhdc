import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import ScheduleSettingsPage from './ScheduleSettingsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const group = {
    id: 1,
    name: 'Break dance',
    style: 'Breakdance',
    level: 'PRO' as const,
    maxParticipants: 20,
    lessonPriceCents: 1500,
    choreographerId: 1,
    choreographer: { id: 1, firstName: 'Ivan', lastName: 'Petrov' },
    slots: [],
    createdAt: '2026-01-01',
};

const statistics = {
    totals: { branchCount: 1, groupCount: 1, activeCount: 5, inactiveCount: 1, capacity: 20 },
    branches: [
        {
            id: 1, name: 'Central', isActive: true, groupCount: 1, capacity: 20,
            activeCount: 5, inactiveCount: 1, unassignedCount: 0,
            activeStudents: [], inactiveStudents: [],
        },
    ],
    groups: [
        { id: 1, name: 'Break dance', branchId: 1, activeCount: 5, inactiveCount: 1, totalCount: 6, activeStudents: [], inactiveStudents: [] },
    ],
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/schedule/groups') return Promise.resolve({ data: { data: [group], total: 1 } });
        if (url === '/schedule/groups-management/stats') return Promise.resolve({ data: statistics });
        if (url === '/schedule/styles') return Promise.resolve({ data: ['Breakdance'] });
        if (url === '/schedule/choreographers') return Promise.resolve({ data: [{ id: 1, firstName: 'Ivan', lastName: 'Petrov' }] });
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ScheduleSettingsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('ScheduleSettingsPage', () => {
    test('renders the loaded groups and totals summary', async () => {
        renderPage();
        expect(await screen.findByText('Break dance')).toBeInTheDocument();
        // the i18next mock returns the raw, un-interpolated key
        expect(screen.getByText('Группы ({{allTotal}}/{{total}})')).toBeInTheDocument();
    });

    test('renders the branch statistics summary cards', async () => {
        renderPage();
        await screen.findByText('Break dance');

        expect(screen.getByText('Филиалы')).toBeInTheDocument();
        expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });

    test('re-fetches groups with the style filter applied', async () => {
        renderPage();
        await screen.findByText('Break dance');
        ($apiPrivate.get as jest.Mock).mockClear();

        fireEvent.change(screen.getByDisplayValue('Все стили'), { target: { value: 'Breakdance' } });

        await waitFor(() => {
            expect($apiPrivate.get).toHaveBeenCalledWith('/schedule/groups', { params: { style: 'Breakdance' } });
        });
    });

    test('deletes a group after confirmation and refreshes', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        await screen.findByText('Break dance');

        fireEvent.click(screen.getByTitle('Удалить'));

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/schedule/groups/1'));
        expect(toast.success).toHaveBeenCalledWith('Группа удалена');
    });

    test('opens the create-group modal', async () => {
        renderPage();
        await screen.findByText('Break dance');

        fireEvent.click(screen.getByText('+ Создать группу'));

        expect(screen.getByText('СОЗДАТЬ ГРУППУ')).toBeInTheDocument();
    });

    test('shows an empty state when there are no groups', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/schedule/groups') return Promise.resolve({ data: { data: [], total: 0 } });
            if (url === '/schedule/groups-management/stats') return Promise.resolve({ data: statistics });
            return Promise.resolve({ data: [] });
        });
        renderPage();

        expect(await screen.findByText('Группы не найдены')).toBeInTheDocument();
    });
});
