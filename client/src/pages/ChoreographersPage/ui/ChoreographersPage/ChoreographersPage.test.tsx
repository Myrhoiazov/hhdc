import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import ChoreographersPage from './ChoreographersPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const choreographers = [
    { id: 1, firstName: 'Ivan', lastName: 'Petrov', showOnSite: true },
    { id: 2, firstName: 'Petr', lastName: 'Ivanov', showOnSite: true },
];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: choreographers });
});

function renderPage(route = '/choreographers') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>
                <ChoreographersPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('ChoreographersPage', () => {
    test('renders the loaded choreographers', async () => {
        renderPage();
        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect(screen.getByText('Petr Ivanov')).toBeInTheDocument();
    });

    test('filters by the _q search param', async () => {
        renderPage('/choreographers?_q=petr%20ivanov');
        await screen.findByText('Petr Ivanov');
        expect(screen.queryByText('Ivan Petrov')).not.toBeInTheDocument();
    });

    test('shows an empty state when there are none', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [] });
        renderPage();
        expect(await screen.findByText('Хореографов пока нет')).toBeInTheDocument();
    });

    test('deletes a choreographer after confirmation', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        await screen.findByText('Ivan Petrov');

        fireEvent.click(screen.getAllByTitle('Удалить')[0]);

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/schedule/choreographers/1'));
        expect(toast.success).toHaveBeenCalledWith('Удалён');
    });
});
