import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { addPersonRole, getPerson, getPersonActivity, Person, removePersonRole, savePerson } from '@/entities/Person';
import { listPersonTeamRoles } from '@/entities/EventTeam';
import { PersonPage } from './PersonPage';

jest.mock('@/entities/Person', () => ({
    ...jest.requireActual('@/entities/Person'),
    getPerson: jest.fn(), getPersonActivity: jest.fn(), savePerson: jest.fn(),
    addPersonRole: jest.fn(), removePersonRole: jest.fn(),
    PERSON_ROLES: ['CUSTOMER', 'PARTICIPANT', 'CHOREOGRAPHER', 'STAFF', 'PARTNER'],
    PERSON_SOURCES: ['WEEZTIX', 'EMAIL', 'MANUAL', 'IMPORT', 'SYSTEM'],
}));
jest.mock('@/entities/EventTeam', () => ({ listPersonTeamRoles: jest.fn() }));
jest.mock('react-redux', () => ({ useSelector: () => ({ permissions: [] }) }));
jest.mock('@/entities/User', () => ({ getUserAuthData: jest.fn(), useCan: () => () => false }));
jest.mock('@/widgets/Page/Page', () => ({ Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
jest.mock('./conversations/PersonConversations', () => ({ PersonConversations: () => null }));
jest.mock('@/widgets/PersonExpenses', () => ({ PersonExpenses: () => null }));
jest.mock('./orders/PersonOrders', () => ({ PersonOrders: () => null }));
jest.mock('../PersonRemoval', () => ({ PersonRemovalPanel: () => null }));

const anna: Person = { id: 'p1', firstName: 'Anna', lastName: 'Berg', displayName: 'Anna Berg', email: 'anna@example.test', phone: null, status: 'ACTIVE', roles: [{ role: 'CUSTOMER' }] };

const renderPage = (state?: unknown) => render(<MemoryRouter initialEntries={[{ pathname: '/people/p1', state }]}>
    <Routes><Route path="/people/:id" element={<PersonPage />} /></Routes>
</MemoryRouter>);

beforeEach(() => {
    jest.mocked(getPerson).mockResolvedValue(anna);
    jest.mocked(getPersonActivity).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(listPersonTeamRoles).mockResolvedValue([]);
});

test('the back link returns to the page of the list the contact was opened from', async () => {
    renderPage({ peopleList: '/people?source=EMAIL&page=3' });

    expect(await screen.findByRole('heading', { name: 'Anna Berg' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to contacts/ })).toHaveAttribute('href', '/people?source=EMAIL&page=3');
});

test('a contact opened by its address leads back to the plain list', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Anna Berg' });
    expect(screen.getByRole('link', { name: /Back to contacts/ })).toHaveAttribute('href', '/people');
});

test('the summary names the contact details; a role it has is a badge and a role it lacks is a button that gives it', async () => {
    jest.mocked(addPersonRole).mockResolvedValue(undefined as never);
    renderPage();

    const summary = await screen.findByRole('region', { name: 'Contact summary' });
    expect(within(summary).getByRole('link', { name: 'anna@example.test' })).toHaveAttribute('href', 'mailto:anna@example.test');
    expect(within(summary).getByText('CUSTOMER')).toBeInTheDocument();
    expect(within(summary).queryByText('+ CUSTOMER')).not.toBeInTheDocument();
    fireEvent.click(within(summary).getByText('+ STAFF'));
    await waitFor(() => expect(addPersonRole).toHaveBeenCalledWith('p1', 'STAFF'));
    expect(within(summary).getByText('+ PARTNER')).toBeInTheDocument();
});

test('a role given by mistake is taken away with the cross on its badge, and the contact is read again', async () => {
    jest.mocked(removePersonRole).mockResolvedValue(undefined);
    renderPage();

    const summary = await screen.findByRole('region', { name: 'Contact summary' });
    const badge = within(summary).getByText('CUSTOMER');
    fireEvent.click(within(badge).getByRole('button'));
    await waitFor(() => expect(removePersonRole).toHaveBeenCalledWith('p1', 'CUSTOMER'));
    await waitFor(() => expect(getPerson).toHaveBeenCalledTimes(2));
});

test('a refusal to change a role is shown next to the roles', async () => {
    jest.mocked(removePersonRole).mockRejectedValue(new Error('No permission'));
    renderPage();

    const summary = await screen.findByRole('region', { name: 'Contact summary' });
    fireEvent.click(within(within(summary).getByText('CUSTOMER')).getByRole('button'));
    expect(await within(summary).findByRole('alert')).toHaveTextContent('No permission');
});

test('saving says so, until the form is changed again', async () => {
    jest.mocked(savePerson).mockResolvedValue(anna);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Anne' } });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});

test('the events a contact worked on are listed with the role; a contact who never did has no such block', async () => {
    const { unmount } = renderPage();
    await screen.findByRole('heading', { name: 'Anna Berg' });
    expect(screen.queryByRole('region', { name: 'Work on events' })).not.toBeInTheDocument();
    unmount();

    jest.mocked(listPersonTeamRoles).mockResolvedValue([{ id: 'm1', roleTitle: 'Videographer', duties: null, event: { id: 'e1', name: 'Dance Camp', startAt: '2027-05-21T10:00:00Z' } }]);
    renderPage();
    const block = await screen.findByRole('region', { name: 'Work on events' });
    expect(within(block).getByRole('link', { name: 'Dance Camp' })).toHaveAttribute('href', '/events/e1');
    expect(within(block).getByText('Videographer')).toBeInTheDocument();
});
