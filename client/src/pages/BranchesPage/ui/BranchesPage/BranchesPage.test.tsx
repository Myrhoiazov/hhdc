import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import BranchesPage from './BranchesPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const branches = [
    { id: 1, name: 'Central', city: 'Kyiv', isActive: true },
    { id: 2, name: 'North', city: 'Kharkiv', isActive: true },
];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: branches });
});

function renderPage(route = '/branches') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>
                <BranchesPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('BranchesPage', () => {
    test('renders the loaded branches', async () => {
        renderPage();
        expect(await screen.findByText('Central')).toBeInTheDocument();
        expect(screen.getByText('North')).toBeInTheDocument();
    });

    test('filters branches by the _q search param', async () => {
        renderPage('/branches?_q=north');
        await screen.findByText('North');
        expect(screen.queryByText('Central')).not.toBeInTheDocument();
    });

    test('shows an empty state when there are no branches', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [] });
        renderPage();
        expect(await screen.findByText('Филиалов пока нет')).toBeInTheDocument();
    });

    test('deletes a branch after confirmation', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        await screen.findByText('Central');

        fireEvent.click(screen.getAllByTitle('Удалить')[0]);

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/company/branches/1'));
        expect(toast.success).toHaveBeenCalledWith('Филиал удалён');
    });

    test('opens the create modal', async () => {
        renderPage();
        await screen.findByText('Central');

        fireEvent.click(screen.getByText('+ Добавить филиал'));

        expect(screen.getByText('СОЗДАТЬ ФИЛИАЛ')).toBeInTheDocument();
    });
});
