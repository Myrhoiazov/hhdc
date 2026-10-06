import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { fetchGlobalSearch } from '../../model/services/fetchGlobalSearch/fetchGlobalSearch';
import { GlobalSearchResponse } from '../../model/types/globalSearch';

jest.mock('../../model/services/fetchGlobalSearch/fetchGlobalSearch');

const mockedFetch = fetchGlobalSearch as jest.MockedFunction<typeof fetchGlobalSearch>;

const emptyResponse: GlobalSearchResponse = {
    query: '',
    clients: { total: 0, items: [] },
    payments: { total: 0, items: [] },
    groups: { total: 0, items: [] },
    choreographers: { total: 0, items: [] },
    branches: { total: 0, items: [] },
};

const responseWithClient: GlobalSearchResponse = {
    ...emptyResponse,
    clients: {
        total: 1,
        items: [{
            id: 34,
            firstName: 'Карина',
            lastName: 'Арпачи',
            email: null,
            phoneNumber: null,
            branchName: 'Collab industry',
        }],
    },
};

const renderSearch = () => render(<MemoryRouter><GlobalSearch /></MemoryRouter>);

beforeEach(() => {
    jest.useFakeTimers();
    mockedFetch.mockResolvedValue(emptyResponse);
});

afterEach(() => {
    jest.useRealTimers();
});

describe('GlobalSearch', () => {
    test('renders collapsed as an icon button', () => {
        renderSearch();
        expect(screen.getByRole('button', { name: 'Поиск' })).toBeInTheDocument();
    });

    test('expands into an input on icon click', () => {
        renderSearch();
        fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));
        expect(screen.getByPlaceholderText('Поиск клиентов, платежей, групп…')).toBeInTheDocument();
    });

    test('does not call the API before the minimum query length', () => {
        renderSearch();
        fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));
        const input = screen.getByPlaceholderText('Поиск клиентов, платежей, групп…');

        fireEvent.change(input, { target: { value: 'a' } });
        act(() => { jest.advanceTimersByTime(1000); });

        expect(mockedFetch).not.toHaveBeenCalled();
    });

    test('debounces input and shows grouped results after the minimum query length', async () => {
        mockedFetch.mockResolvedValue(responseWithClient);
        renderSearch();
        fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));
        const input = screen.getByPlaceholderText('Поиск клиентов, платежей, групп…');

        fireEvent.change(input, { target: { value: 'Карина' } });
        expect(mockedFetch).not.toHaveBeenCalled();

        await act(async () => { jest.advanceTimersByTime(350); });

        await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith('Карина', expect.any(AbortSignal)));
        await waitFor(() => expect(screen.getByText('Карина Арпачи')).toBeInTheDocument());
        expect(screen.getByText('Клиенты')).toBeInTheDocument();
    });

    test('Escape closes the dropdown', () => {
        renderSearch();
        fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));
        const input = screen.getByPlaceholderText('Поиск клиентов, платежей, групп…');

        fireEvent.keyDown(input, { key: 'Escape' });

        expect(screen.queryByPlaceholderText('Поиск клиентов, платежей, групп…')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Поиск' })).toBeInTheDocument();
    });

    test('clicking a result navigates and closes the dropdown', async () => {
        mockedFetch.mockResolvedValue(responseWithClient);
        renderSearch();
        fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));
        const input = screen.getByPlaceholderText('Поиск клиентов, платежей, групп…');

        fireEvent.change(input, { target: { value: 'Карина' } });
        await act(async () => { jest.advanceTimersByTime(350); });
        await waitFor(() => expect(screen.getByText('Карина Арпачи')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Карина Арпачи'));

        expect(screen.queryByPlaceholderText('Поиск клиентов, платежей, групп…')).not.toBeInTheDocument();
    });
});
