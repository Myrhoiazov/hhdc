import { render, screen } from '@testing-library/react';
import { Person } from '@/entities/crm';
import { PersonRemovalPanel } from './PersonRemoval';

jest.mock('@/entities/crm', () => ({ deletePerson: jest.fn() }));

const person = (removal: Person['removal']): Person => ({ id: 'p1', firstName: '', lastName: '', displayName: 'info@example.test', email: 'info@example.test', status: 'ACTIVE', roles: [], removal });

test('a mail contact offers deleting and says that its letters stay', () => {
    render(<PersonRemovalPanel person={person({ allowed: true, blockers: [] })} onDeleted={jest.fn()} />);

    expect(screen.getByRole('button', { name: /^Delete contact/ })).toBeInTheDocument();
    expect(screen.getByText(/Its letters stay in the mailbox/)).toBeInTheDocument();
});

test('a contact tied to Weeztix has no button and names every reason', () => {
    render(<PersonRemovalPanel person={person({ allowed: false, blockers: ['WEEZTIX', 'PURCHASES'] })} onDeleted={jest.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Removal blocker: WEEZTIX')).toBeInTheDocument();
    expect(screen.getByText('Removal blocker: PURCHASES')).toBeInTheDocument();
});
