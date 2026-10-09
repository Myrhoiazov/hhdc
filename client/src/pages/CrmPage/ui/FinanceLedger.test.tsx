import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getLedgerSummary, LedgerEntry, LedgerSummary, listEvents, listLedgerPage, requestRefund } from '@/entities/crm';
import { FinanceLedger } from './FinanceLedger';

jest.mock('@/entities/crm', () => ({
    listLedgerPage: jest.fn(), getLedgerSummary: jest.fn(), listEvents: jest.fn(), requestRefund: jest.fn(), actOnRefund: jest.fn(),
    LIST_PAGE_SIZE: 25, LEDGER_CATEGORIES: ['TICKETS', 'REFUNDS', 'FEE', 'VENUE'],
}));

const entry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({
    id: 'PAYMENT:pay-1', kind: 'PAYMENT', category: 'TICKETS', direction: 'IN', date: '2026-05-04T10:00:00Z', amount: '445.35', currency: 'EUR', status: 'PAID',
    description: 'ideal', person: { id: 'p1', name: 'Anna Berg' }, event: { id: 'e1', name: 'Dance Camp' }, counted: true, paidAmount: '452.10', ...overrides,
});
const fee = entry({ id: 'EXPENSE:x1', kind: 'EXPENSE', category: 'FEE', direction: 'OUT', amount: '300.00', status: 'PLANNED', description: 'Workshop fee', person: null, event: null, paidAmount: null });

const summary: LedgerSummary = {
    currency: 'EUR', income: '445.35', refunds: '0.00', expenses: '300.00', planned: '300.00', result: '145.35', operations: 2,
    byCategory: [{ category: 'TICKETS', direction: 'IN', operations: 1, amount: '445.35' }, { category: 'FEE', direction: 'OUT', operations: 1, amount: '300.00' }],
};
const NO_FILTERS = { q: '', category: '', eventId: '', from: '', to: '' };
const renderLedger = (onRefundRequested = jest.fn()) => render(<MemoryRouter><FinanceLedger onRefundRequested={onRefundRequested} /></MemoryRouter>);

beforeEach(() => {
    jest.mocked(listLedgerPage).mockReset().mockResolvedValue({ data: [entry(), fee], total: 2 });
    jest.mocked(getLedgerSummary).mockReset().mockResolvedValue(summary);
    jest.mocked(listEvents).mockReset().mockResolvedValue({ data: [{ id: 'e1', name: 'Dance Camp' }] as never, total: 1 });
    jest.mocked(requestRefund).mockReset();
});

test('operations are rows with the person, the event and a signed amount; the tiles add them up', async () => {
    renderLedger();

    const row = (await screen.findByRole('link', { name: 'Anna Berg' })).closest('tr') as HTMLElement;
    expect(screen.getByRole('link', { name: 'Anna Berg' })).toHaveAttribute('href', '/people/p1');
    expect(within(row).getByRole('link', { name: 'Dance Camp' })).toHaveAttribute('href', '/events/e1');
    expect(within(row).getByText('+€445.35')).toBeInTheDocument();
    expect(screen.getByText('−€300.00')).toBeInTheDocument();
    expect(await screen.findByText('€145')).toBeInTheDocument();
});

test('filters narrow both the list and the totals and return to the first page', async () => {
    jest.mocked(listLedgerPage).mockResolvedValue({ data: [entry()], total: 60 });
    renderLedger();
    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listLedgerPage).toHaveBeenLastCalledWith(NO_FILTERS, 2));

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'FEE' } });
    await waitFor(() => expect(listLedgerPage).toHaveBeenLastCalledWith({ ...NO_FILTERS, category: 'FEE' }, 1));
    fireEvent.change(screen.getByLabelText('Period from'), { target: { value: '2026-05-01' } });
    await waitFor(() => expect(getLedgerSummary).toHaveBeenLastCalledWith({ ...NO_FILTERS, category: 'FEE', from: '2026-05-01' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(listLedgerPage).toHaveBeenLastCalledWith(NO_FILTERS, 1));
});

test('the view by category adds operations up, and a category opens its operations', async () => {
    renderLedger();
    await screen.findByRole('link', { name: 'Anna Berg' });

    fireEvent.click(screen.getByRole('button', { name: 'By category' }));
    expect(screen.getByRole('button', { name: 'By category' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: 'Anna Berg' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ledger category: FEE' }));

    await waitFor(() => expect(listLedgerPage).toHaveBeenLastCalledWith({ ...NO_FILTERS, category: 'FEE' }, 1));
    expect(screen.getByRole('button', { name: 'By date' })).toHaveAttribute('aria-pressed', 'true');
});

test('a refund is asked for from the row of a paid payment only', async () => {
    jest.mocked(requestRefund).mockResolvedValue({} as never);
    const onRefundRequested = jest.fn();
    renderLedger(onRefundRequested);
    await screen.findByRole('link', { name: 'Anna Berg' });

    expect(screen.getAllByRole('button', { name: 'Refund' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Cannot come' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request refund' }));

    await waitFor(() => expect(requestRefund).toHaveBeenCalledWith({ paymentId: 'pay-1', amount: '452.10', reason: 'Cannot come' }));
    await waitFor(() => expect(onRefundRequested).toHaveBeenCalled());
});

test('an empty list says so', async () => {
    jest.mocked(listLedgerPage).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(getLedgerSummary).mockResolvedValue({ ...summary, operations: 0, byCategory: [] });
    renderLedger();

    expect(await screen.findByText('No operations yet')).toBeInTheDocument();
});
