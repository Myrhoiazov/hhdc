import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AuditEntry, getAuditOptions, listAuditPage } from '@/entities/crm';
import { AuditPage } from './AuditList';

jest.mock('@/entities/crm', () => ({ getAuditOptions: jest.fn(), listAuditPage: jest.fn(), LIST_PAGE_SIZE: 25 }));
jest.mock('@/widgets/Page', () => ({ Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
jest.mock('./ListTable', () => ({ ...jest.requireActual('./ListTable'), useDelayed: (value: string) => value }));

const actor = { id: 'u1', name: 'Test Admin', email: 'admin@example.test' };
const entry = (id: string, overrides: Partial<AuditEntry> = {}): AuditEntry => ({
    id, action: 'EVENT_EXPENSE_CREATED', entityType: 'EventExpense', entityId: 'x1', ipAddress: '10.0.0.1', createdAt: '2026-10-08T15:00:00Z', actor, ...overrides,
});
const NO_FILTERS = { q: '', entityType: '', actorUserId: '', from: '', to: '' };

beforeEach(() => {
    jest.mocked(listAuditPage).mockReset().mockResolvedValue({ data: [entry('a1'), entry('a2', { actor: null, action: 'PROVIDER_SYNC_REQUESTED', entityType: 'ProviderConnection', ipAddress: null })], total: 2 });
    jest.mocked(getAuditOptions).mockReset().mockResolvedValue({ entityTypes: ['EventExpense', 'Person'], actors: [actor] });
});

test('an entry is a table row: when, who, what was done and to which kind of record', async () => {
    render(<AuditPage />);

    const row = (await screen.findByText('EVENT_EXPENSE_CREATED')).closest('tr') as HTMLElement;
    for (const text of ['Test Admin', 'EventExpense', '10.0.0.1']) expect(within(row).getByText(text)).toBeInTheDocument();
    const system = screen.getByText('PROVIDER_SYNC_REQUESTED').closest('tr') as HTMLElement;
    expect(within(system).getByText('System')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

test('the log is filtered by action, record, staff member and period, and reset clears it all', async () => {
    render(<AuditPage />);
    await screen.findByRole('option', { name: 'Person' });

    fireEvent.change(screen.getByLabelText('Search by action'), { target: { value: 'expense' } });
    fireEvent.change(screen.getByLabelText('Record'), { target: { value: 'Person' } });
    fireEvent.change(screen.getByLabelText('Staff member'), { target: { value: 'u1' } });
    fireEvent.change(screen.getByLabelText('Period from'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Period until'), { target: { value: '2026-10-08' } });
    await waitFor(() => expect(listAuditPage).toHaveBeenLastCalledWith({ q: 'expense', entityType: 'Person', actorUserId: 'u1', from: '2026-10-01', to: '2026-10-08' }, 1));

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(listAuditPage).toHaveBeenLastCalledWith(NO_FILTERS, 1));
});

test('pages are turned, a filter returns to the first page, and an empty result says why', async () => {
    jest.mocked(listAuditPage).mockResolvedValue({ data: [entry('a1')], total: 60 });
    render(<AuditPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listAuditPage).toHaveBeenLastCalledWith(NO_FILTERS, 2));

    jest.mocked(listAuditPage).mockResolvedValue({ data: [], total: 0 });
    fireEvent.change(screen.getByLabelText('Record'), { target: { value: 'Person' } });
    await waitFor(() => expect(listAuditPage).toHaveBeenLastCalledWith({ ...NO_FILTERS, entityType: 'Person' }, 1));
    expect(await screen.findByText('No entries match the filters')).toBeInTheDocument();
});
