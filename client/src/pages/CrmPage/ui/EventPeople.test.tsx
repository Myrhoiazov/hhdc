import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Event, EventRegistration, listEventRegistrations, listPeople, registerPerson } from '@/entities/crm';
import { EventPeople } from './EventPeople';

jest.mock('@/entities/crm', () => ({
    assignChoreographer: jest.fn(), listEventRegistrations: jest.fn(), listPeople: jest.fn(), registerPerson: jest.fn(),
    LIST_PAGE_SIZE: 25, REGISTRATION_STATUSES: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
}));
jest.mock('./ListTable', () => ({ ...jest.requireActual('./ListTable'), useDelayed: (value: string) => value }));

const person = { id: 'p1', displayName: 'Anna Berg', firstName: 'Anna', lastName: 'Berg', email: 'anna@example.test', phone: '+31600000001', country: 'Nederland' };
const registration = (id: string, overrides: Partial<EventRegistration> = {}): EventRegistration => ({
    id, status: 'CONFIRMED', registrationSource: 'WEEZTIX', createdAt: '2026-10-08T15:00:00Z', person, ticket: { ticketType: 'Early Bird | Full Pass', status: 'VALID' }, ...overrides,
});
const event: Event = {
    id: 'e1', name: 'Dance Camp', slug: 'dance-camp', status: 'PUBLISHED', startAt: '2027-05-21T10:00:00Z', endAt: '2027-05-23T18:00:00Z', timezone: 'Europe/Amsterdam',
    choreographers: [{ id: 'c1', status: 'CONFIRMED', roleTitle: 'Choreographer', person: { id: 'p9', firstName: 'Mila', lastName: 'Novak', email: 'mila@example.test', status: 'ACTIVE', roles: [] } }],
};
const NO_FILTERS = { q: '', status: '' };
const onSaved = jest.fn();
const renderPeople = (shown: Event = event) => render(<MemoryRouter><EventPeople event={shown} onSaved={onSaved} /></MemoryRouter>);

beforeEach(() => {
    onSaved.mockReset();
    jest.mocked(listEventRegistrations).mockReset().mockResolvedValue({ data: [registration('r1')], total: 1 });
    jest.mocked(listPeople).mockReset().mockResolvedValue({ data: [], total: 0 });
    jest.mocked(registerPerson).mockReset().mockResolvedValue({});
});

test('a registered person is a table row like on the people page, with the ticket and the status', async () => {
    renderPeople();

    const list = await screen.findByRole('region', { name: 'Registrations' });
    const link = await within(list).findByRole('link', { name: 'Anna Berg' });
    expect(link).toHaveAttribute('href', '/people/p1');
    const row = link.closest('tr') as HTMLElement;
    for (const text of ['anna@example.test', '+31600000001', 'Nederland', 'Early Bird | Full Pass', 'CONFIRMED']) expect(within(row).getByText(text)).toBeInTheDocument();
    expect(listEventRegistrations).toHaveBeenCalledWith('e1', NO_FILTERS, 1);
});

test('the list is searched, filtered by status and paged', async () => {
    jest.mocked(listEventRegistrations).mockResolvedValue({ data: [registration('r1')], total: 60 });
    renderPeople();
    const list = await screen.findByRole('region', { name: 'Registrations' });

    fireEvent.click(await within(list).findByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listEventRegistrations).toHaveBeenLastCalledWith('e1', NO_FILTERS, 2));
    fireEvent.change(within(list).getByLabelText('Status'), { target: { value: 'CHECKED_IN' } });
    await waitFor(() => expect(listEventRegistrations).toHaveBeenLastCalledWith('e1', { q: '', status: 'CHECKED_IN' }, 1));
    fireEvent.change(within(list).getByLabelText('Search by name, email or phone'), { target: { value: 'anna' } });
    await waitFor(() => expect(listEventRegistrations).toHaveBeenLastCalledWith('e1', { q: 'anna', status: 'CHECKED_IN' }, 1));
});

test('choreographers are listed with their role, or the page says none are assigned', async () => {
    const { unmount } = renderPeople();
    const list = await screen.findByRole('region', { name: 'Choreographers' });
    expect(within(list).getByRole('link', { name: 'Mila Novak' })).toHaveAttribute('href', '/people/choreographers/p9/events');
    expect(within(list).getByText('Choreographer')).toBeInTheDocument();
    unmount();

    renderPeople({ ...event, choreographers: [] });
    expect(await screen.findByText('No choreographers assigned yet')).toBeInTheDocument();
});

test('a person is found by typing and registered; the list is then read again', async () => {
    jest.mocked(listPeople).mockResolvedValue({ data: [{ id: 'p2', firstName: 'Bo', lastName: 'Lind', displayName: 'Bo Lind', email: 'bo@example.test', status: 'ACTIVE', roles: [] }], total: 1 });
    renderPeople();
    const form = await screen.findByRole('region', { name: 'Add a person to the event' });
    expect(within(form).getByRole('button', { name: 'Register participant' })).toBeDisabled();

    fireEvent.change(within(form).getByLabelText('Find contact'), { target: { value: 'bo' } });
    await waitFor(() => expect(listPeople).toHaveBeenLastCalledWith('bo'));
    await within(form).findByRole('option', { name: /Bo Lind/ });
    fireEvent.change(within(form).getByLabelText('Contact'), { target: { value: 'p2' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Register participant' }));

    await waitFor(() => expect(registerPerson).toHaveBeenCalledWith('e1', 'p2'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listEventRegistrations).toHaveBeenCalledTimes(2));
});
