import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { deletePerson, listPeoplePage, Person } from '@/entities/crm';
import { PeoplePage } from './PeopleList';

jest.mock('@/entities/crm', () => ({
    listPeoplePage: jest.fn(), deletePerson: jest.fn(), LIST_PAGE_SIZE: 25, PERSON_SOURCES: ['WEEZTIX', 'EMAIL', 'MANUAL', 'IMPORT', 'SYSTEM'],
}));
let mockPermissions: string[] = [];
jest.mock('react-redux', () => ({ useSelector: () => ({ permissions: mockPermissions }) }));
jest.mock('@/entities/User', () => ({ getUserAuthData: jest.fn() }));
jest.mock('@/widgets/Page', () => ({ Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const person = (id: string, overrides: Partial<Person> = {}): Person => ({
    id, firstName: 'Anna', lastName: 'Berg', displayName: 'Anna Berg', email: 'anna@example.test', phone: '+31600000001', status: 'ACTIVE', roles: [{ role: 'CUSTOMER' }],
    country: 'Nederland', source: 'WEEZTIX', createdAt: '2026-10-08T15:44:00Z', _count: { orders: 3 }, ...overrides,
});

const NO_FILTERS = { q: '', role: '', source: '', purchases: '' };
const renderPage = () => render(<MemoryRouter><PeoplePage /></MemoryRouter>);

beforeEach(() => { jest.mocked(listPeoplePage).mockReset(); jest.mocked(deletePerson).mockReset(); mockPermissions = ['people.write']; });

test('a contact is a table row: name linking to the person, email, phone, country, roles and purchases', async () => {
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [person('p1')], total: 1 });
    renderPage();

    const row = (await screen.findByRole('link', { name: 'Anna Berg' })).closest('tr') as HTMLElement;
    expect(screen.getByRole('link', { name: 'Anna Berg' })).toHaveAttribute('href', '/people/p1');
    for (const text of ['anna@example.test', '+31600000001', 'Nederland', 'CUSTOMER', '3']) expect(within(row).getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

test('a contact known only by its address shows the address once, as the name', async () => {
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [person('p1', { firstName: '', lastName: '', displayName: 'info@example.test', email: 'info@example.test' })], total: 1 });
    renderPage();

    await screen.findByRole('link', { name: 'info@example.test' });
    expect(screen.getAllByText('info@example.test')).toHaveLength(1);
});

test('pages are turned with the arrows and the current page is named', async () => {
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [person('p1')], total: 60 });
    renderPage();

    await screen.findByRole('navigation');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listPeoplePage).toHaveBeenLastCalledWith(NO_FILTERS, 2));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listPeoplePage).toHaveBeenLastCalledWith(NO_FILTERS, 3));
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

test('a filter narrows the list and returns to the first page; reset clears every filter', async () => {
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [person('p1')], total: 60 });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listPeoplePage).toHaveBeenLastCalledWith(NO_FILTERS, 2));

    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'EMAIL' } });
    await waitFor(() => expect(listPeoplePage).toHaveBeenLastCalledWith({ ...NO_FILTERS, source: 'EMAIL' }, 1));
    fireEvent.change(screen.getByLabelText('Purchases filter'), { target: { value: 'no' } });
    await waitFor(() => expect(listPeoplePage).toHaveBeenLastCalledWith({ ...NO_FILTERS, source: 'EMAIL', purchases: 'no' }, 1));

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(listPeoplePage).toHaveBeenLastCalledWith(NO_FILTERS, 1));
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
});

test('typing searches once the typing pauses, not on every key', async () => {
    jest.useFakeTimers();
    try {
        jest.mocked(listPeoplePage).mockResolvedValue({ data: [], total: 0 });
        renderPage();
        await act(async () => { await Promise.resolve(); });
        const calls = jest.mocked(listPeoplePage).mock.calls.length;

        fireEvent.change(screen.getByLabelText('Search by name, email or phone'), { target: { value: 'an' } });
        fireEvent.change(screen.getByLabelText('Search by name, email or phone'), { target: { value: 'anna' } });
        expect(listPeoplePage).toHaveBeenCalledTimes(calls);
        await act(async () => { jest.advanceTimersByTime(300); await Promise.resolve(); });

        expect(listPeoplePage).toHaveBeenCalledTimes(calls + 1);
        expect(listPeoplePage).toHaveBeenLastCalledWith({ ...NO_FILTERS, q: 'anna' }, 1);
        expect(await screen.findByText('No contacts match the filters')).toBeInTheDocument();
    } finally { jest.useRealTimers(); }
});

const mailOnly = person('p1', { displayName: 'noreply@example.test', email: 'noreply@example.test', source: 'EMAIL', removal: { allowed: true, blockers: [] } });
const fromWeeztix = person('p2', { removal: { allowed: false, blockers: ['WEEZTIX', 'PURCHASES'] } });

test('only a contact that a mailbox created can be deleted, and only after a second press', async () => {
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [mailOnly, fromWeeztix], total: 2 });
    jest.mocked(deletePerson).mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findAllByRole('button', { name: /^Delete contact/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Delete contact/ }));
    expect(deletePerson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
    await waitFor(() => expect(deletePerson).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(listPeoplePage).toHaveBeenCalledTimes(2));
});

test('cancelling keeps the contact, and a refusal of the server is shown', async () => {
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [mailOnly], total: 1 });
    jest.mocked(deletePerson).mockRejectedValue(new Error('This contact cannot be deleted: it has purchases'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /^Delete contact/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deletePerson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Delete contact/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('it has purchases');
});

test('staff who may not change contacts see no delete buttons', async () => {
    mockPermissions = ['people.read'];
    jest.mocked(listPeoplePage).mockResolvedValue({ data: [mailOnly], total: 1 });
    renderPage();

    await screen.findByRole('link', { name: 'noreply@example.test' });
    expect(screen.queryByRole('button', { name: /Delete contact/ })).not.toBeInTheDocument();
});
