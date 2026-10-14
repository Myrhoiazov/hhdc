import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
    addTeamMember,
    listEventTeam,
    removeTeamMember,
    TeamMember,
    updateTeamMember,
} from '@/entities/EventTeam';
import { createEventExpense } from '@/entities/EventExpense';
import { listPeople } from '@/entities/Person';
import { EventTeam } from './EventTeam';

jest.mock('@/entities/EventTeam', () => ({
    addTeamMember: jest.fn(),
    listEventTeam: jest.fn(),
    removeTeamMember: jest.fn(),
    updateTeamMember: jest.fn(),
    TEAM_PERSON_ROLES: ['STAFF', 'PARTNER'],
}));
jest.mock('@/entities/EventExpense', () => ({ createEventExpense: jest.fn() }));
jest.mock('@/entities/Person', () => ({ listPeople: jest.fn() }));
jest.mock('@/shared/lib/hooks/useDelayed/useDelayed', () => ({
    ...jest.requireActual('@/shared/lib/hooks/useDelayed/useDelayed'),
    useDelayed: (value: string) => value,
}));

const member = (overrides: Partial<TeamMember> = {}): TeamMember => ({
    id: 'm1',
    roleTitle: 'Videographer',
    duties: 'Films the show',
    notes: null,
    person: { id: 'p1', displayName: 'Ivo Dahl', email: 'ivo@example.com', phone: '+31 6 1234' },
    pay: { total: '1200.00', paid: '500.00', planned: '700.00', currency: 'EUR' },
    ...overrides,
});
const found = {
    id: 'p2',
    displayName: 'Bo Lind',
    firstName: 'Bo',
    lastName: 'Lind',
    email: 'bo@example.com',
};

interface Rights {
    canEdit?: boolean;
    seesMoney?: boolean;
    onChanged?: () => void;
}
const renderTeam = ({ canEdit = true, seesMoney = true, onChanged }: Rights = {}) =>
    render(
        <MemoryRouter>
            <EventTeam eventId="e1" canEdit={canEdit} seesMoney={seesMoney} onChanged={onChanged} />
        </MemoryRouter>
    );

beforeEach(() => {
    jest.mocked(listEventTeam).mockReset().mockResolvedValue([member()]);
    jest.mocked(listPeople)
        .mockReset()
        .mockResolvedValue({ data: [found], total: 1 } as never);
    jest.mocked(addTeamMember)
        .mockReset()
        .mockResolvedValue(member({ id: 'm2' }));
    jest.mocked(updateTeamMember).mockReset().mockResolvedValue(member());
    jest.mocked(removeTeamMember).mockReset().mockResolvedValue(undefined);
    jest.mocked(createEventExpense)
        .mockReset()
        .mockResolvedValue({} as never);
});

test('the block shows who works on the event: the role, the duties, how to reach them and the pay', async () => {
    renderTeam();

    const block = await screen.findByRole('region', { name: 'Team' });
    expect(await within(block).findByRole('link', { name: 'Ivo Dahl' })).toHaveAttribute(
        'href',
        '/people/p1'
    );
    expect(within(block).getByRole('link', { name: 'ivo@example.com' })).toHaveAttribute(
        'href',
        'mailto:ivo@example.com'
    );
    expect(within(block).getByRole('link', { name: '+31 6 1234' })).toHaveAttribute(
        'href',
        'tel:+31 6 1234'
    );
    expect(within(block).getByText('Videographer')).toBeInTheDocument();
    expect(within(block).getByText('Films the show')).toBeInTheDocument();
    expect(within(block).getByRole('columnheader', { name: 'Pay' })).toBeInTheDocument();
});

test('somebody who may not see finance sees the team without the pay and cannot enter it', async () => {
    jest.mocked(listEventTeam).mockResolvedValue([member({ pay: undefined })]);
    renderTeam({ seesMoney: false });

    await screen.findByRole('link', { name: 'Ivo Dahl' });
    expect(screen.queryByRole('columnheader', { name: 'Pay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a payment' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pay, if agreed')).not.toBeInTheDocument();
});

test('a viewer without the right to change events gets no form and no buttons', async () => {
    renderTeam({ canEdit: false });

    await screen.findByRole('link', { name: 'Ivo Dahl' });
    expect(screen.queryByRole('form', { name: 'Add a team member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

test('a contact is added to the team with a role, as staff or a partner, with duties and pay', async () => {
    const onChanged = jest.fn();
    renderTeam({ onChanged });

    const form = await screen.findByRole('form', { name: 'Add a team member' });
    fireEvent.change(within(form).getByLabelText('Find contact'), { target: { value: 'bo' } });
    await within(form).findByRole('option', { name: /Bo Lind/ });
    fireEvent.change(within(form).getByLabelText('Contact'), { target: { value: 'p2' } });
    fireEvent.change(within(form).getByLabelText('Works as'), { target: { value: 'PARTNER' } });
    fireEvent.change(within(form).getByLabelText('Role on the event'), {
        target: { value: 'Equipment supplier' },
    });
    fireEvent.change(within(form).getByLabelText('Pay, if agreed'), {
        target: { value: '800,50' },
    });
    fireEvent.change(within(form).getByLabelText('What they do on the event'), {
        target: { value: 'Brings the light' },
    });
    fireEvent.submit(form);

    await waitFor(() =>
        expect(addTeamMember).toHaveBeenCalledWith('e1', {
            personId: 'p2',
            roleTitle: 'Equipment supplier',
            duties: 'Brings the light',
            personRole: 'PARTNER',
            amount: '800.50',
        })
    );
    await waitFor(() => expect(listEventTeam).toHaveBeenCalledTimes(2));
    expect(onChanged).toHaveBeenCalled();
});

test('a member added without pay is sent without an amount', async () => {
    renderTeam();

    const form = await screen.findByRole('form', { name: 'Add a team member' });
    fireEvent.change(within(form).getByLabelText('Find contact'), { target: { value: 'bo' } });
    await within(form).findByRole('option', { name: /Bo Lind/ });
    fireEvent.change(within(form).getByLabelText('Contact'), { target: { value: 'p2' } });
    fireEvent.change(within(form).getByLabelText('Role on the event'), {
        target: { value: 'Photographer' },
    });
    fireEvent.submit(form);

    await waitFor(() =>
        expect(addTeamMember).toHaveBeenCalledWith('e1', {
            personId: 'p2',
            roleTitle: 'Photographer',
            duties: null,
            personRole: 'STAFF',
        })
    );
});

test('the role and the duties of a member can be corrected', async () => {
    renderTeam();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const form = screen.getByRole('form', { name: /^Edit the role/ });
    fireEvent.change(within(form).getByLabelText('What they do on the event'), {
        target: { value: 'Films and edits' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
        expect(updateTeamMember).toHaveBeenCalledWith('e1', 'm1', {
            roleTitle: 'Videographer',
            duties: 'Films and edits',
            notes: null,
        })
    );
    await waitFor(() =>
        expect(screen.queryByRole('form', { name: /^Edit the role/ })).not.toBeInTheDocument()
    );
});

test('a payment to a member becomes a salary among the expenses of the event, naming the role', async () => {
    renderTeam();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a payment' }));
    const form = screen.getByRole('form', { name: /^Add a payment to/ });
    fireEvent.submit(form);
    expect(await within(form).findByRole('alert')).toHaveTextContent(
        'Enter an amount greater than zero'
    );
    expect(createEventExpense).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.click(within(form).getByLabelText('Already paid'));
    fireEvent.submit(form);

    await waitFor(() =>
        expect(createEventExpense).toHaveBeenCalledWith('e1', {
            category: 'SALARY',
            amount: '500',
            expenseDate: null,
            teamMemberId: 'm1',
            status: 'PAID',
        })
    );
});

test('a member is removed from the team only after a second press', async () => {
    renderTeam();

    fireEvent.click(await screen.findByRole('button', { name: /^Remove/ }));
    expect(removeTeamMember).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));

    await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('e1', 'm1'));
    await waitFor(() => expect(listEventTeam).toHaveBeenCalledTimes(2));
});
