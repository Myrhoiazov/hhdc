import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import SchedulePage from './SchedulePage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const group = {
    id: 1,
    name: 'Ballet Group',
    style: 'Ballet',
    level: 'START' as const,
    maxParticipants: 10,
    choreographerId: 1,
    choreographer: { id: 1, firstName: 'Ivan', lastName: 'Petrov' },
    branch: { id: 1, name: 'Center' },
    slots: [{
        id: 1, dayOfWeek: 'Понедельник', startTime: '10:00', endTime: '11:00',
    }],
    createdAt: '2026-01-01T00:00:00Z',
};

const otherGroup = {
    id: 2,
    name: 'Modern Group',
    style: 'Modern',
    level: 'FAN' as const,
    maxParticipants: 10,
    choreographerId: 2,
    choreographer: { id: 2, firstName: 'Petr', lastName: 'Sidorov' },
    branch: { id: 2, name: 'North' },
    slots: [{
        id: 2, dayOfWeek: 'Вторник', startTime: '12:00', endTime: '13:00',
    }],
    createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { total: 2, data: [group, otherGroup] } });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <SchedulePage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('SchedulePage', () => {
    test('fetches and renders a lesson in the grid', async () => {
        renderPage();

        expect(await screen.findByText('Ballet Group')).toBeInTheDocument();
        expect(screen.getByText('10:00–11:00')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/schedule/groups', {
            params: { page: 1, limit: 500 },
        });
    });

    test('shows the empty state when there are no lessons', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { total: 0, data: [] } });

        renderPage();

        expect(await screen.findByText('В расписании пока нет доступных занятий.')).toBeInTheDocument();
    });

    test('filters lessons by choreographer', async () => {
        renderPage();
        await screen.findByText('Ballet Group');
        await screen.findByText('Modern Group');

        fireEvent.change(screen.getByLabelText('Хореограф'), { target: { value: 'Ivan Petrov' } });

        expect(screen.getByText('Ballet Group')).toBeInTheDocument();
        expect(screen.queryByText('Modern Group')).not.toBeInTheDocument();
    });

    test('filters lessons by day of week', async () => {
        renderPage();
        await screen.findByText('Ballet Group');
        await screen.findByText('Modern Group');

        fireEvent.change(screen.getByLabelText('День недели'), { target: { value: 'Вторник' } });

        expect(screen.queryByText('Ballet Group')).not.toBeInTheDocument();
        expect(screen.getByText('Modern Group')).toBeInTheDocument();
    });

    test('renders links to related dance style, choreographer and branch pages', async () => {
        renderPage();
        await screen.findByText('Ballet Group');

        expect(screen.getByRole('link', { name: 'Ballet' })).toHaveAttribute('href', '/schedule/styles?_q=Ballet');
        expect(screen.getByRole('link', { name: 'Ivan Petrov' })).toHaveAttribute('href', '/choreographers?_q=Ivan%20Petrov');
        expect(screen.getByRole('link', { name: 'Center' })).toHaveAttribute('href', '/company/branches?_q=Center');
    });

    test('navigating to the next week updates the selected week date', async () => {
        renderPage();
        await screen.findByText('Ballet Group');

        const dateInput = screen.getByLabelText('Дата') as HTMLInputElement;
        const initialValue = dateInput.value;

        fireEvent.click(screen.getByRole('button', { name: '›' }));

        expect(dateInput.value).not.toBe(initialValue);
    });
});
