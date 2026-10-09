import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createEventExpense, deleteEventExpense, ExpenseLine, ExpenseList, listEventExpenses, listPayees, listPersonExpenses, updateEventExpense } from '@/entities/crm';
import { EventExpenses } from './EventExpenses';
import { PersonExpenses } from './PersonExpenses';

jest.mock('@/entities/crm', () => ({
    createEventExpense: jest.fn(), deleteEventExpense: jest.fn(), listEventExpenses: jest.fn(), listPayees: jest.fn(), listPersonExpenses: jest.fn(), updateEventExpense: jest.fn(),
    EVENT_EXPENSE_CATEGORIES: ['FEE', 'SALARY', 'TRAVEL', 'HOTEL', 'VENUE', 'MARKETING', 'EQUIPMENT', 'OTHER'],
}));
jest.mock('./ListTable', () => ({ ...jest.requireActual('./ListTable'), useDelayed: (value: string) => value }));

const line = (id: string, overrides: Partial<ExpenseLine> = {}): ExpenseLine => ({
    id, source: 'EVENT', category: 'SALARY', description: 'Front desk', amount: '450.00', currency: 'EUR', status: 'PLANNED', date: '2027-05-21',
    person: { id: 'p1', displayName: 'Anna Berg' }, event: { id: 'e1', name: 'Dance Camp' }, ...overrides,
});
const list = (lines: ExpenseLine[]): ExpenseList => ({ lines, totals: { total: '1950.00', paid: '0.00', planned: '1950.00', byCategory: [{ category: 'FEE', amount: '1500.00' }, { category: 'SALARY', amount: '450.00' }] } });
const fee = line('f1', { source: 'CHOREOGRAPHER_FEE', category: 'FEE', description: null, amount: '1500.00', person: { id: 'p9', displayName: 'Mila Novak' }, date: null });

const renderExpenses = (canEdit = true) => render(<MemoryRouter><EventExpenses eventId="e1" canEdit={canEdit} /></MemoryRouter>);

beforeEach(() => {
    jest.mocked(listEventExpenses).mockReset().mockResolvedValue(list([line('x1'), fee]));
    jest.mocked(listPayees).mockReset().mockResolvedValue({ data: [], total: 0 });
    jest.mocked(createEventExpense).mockReset().mockResolvedValue(line('x2'));
    jest.mocked(updateEventExpense).mockReset().mockResolvedValue(line('x1', { status: 'PAID' }));
    jest.mocked(deleteEventExpense).mockReset().mockResolvedValue(undefined);
});

test('the block lists what the event costs with who is paid, and adds everything up', async () => {
    renderExpenses();

    const block = await screen.findByRole('region', { name: 'Expenses' });
    expect(await within(block).findByRole('link', { name: 'Anna Berg' })).toHaveAttribute('href', '/people/p1');
    expect(within(block).getByText('Front desk')).toBeInTheDocument();
    expect(within(block).getByText(/Total/)).toBeInTheDocument();
    expect(within(block).getByRole('link', { name: 'Mila Novak' })).toBeInTheDocument();
});

test('an expense of the event can be marked paid; a line from a choreographer card is only shown', async () => {
    renderExpenses();

    const ownRow = (await screen.findByRole('link', { name: 'Anna Berg' })).closest('tr') as HTMLElement;
    const feeRow = screen.getByRole('link', { name: 'Mila Novak' }).closest('tr') as HTMLElement;
    expect(within(feeRow).queryByRole('button')).not.toBeInTheDocument();
    expect(within(feeRow).getAllByText("From the choreographer's card").length).toBeGreaterThan(0);

    fireEvent.click(within(ownRow).getByRole('button', { name: 'Mark paid' }));
    await waitFor(() => expect(updateEventExpense).toHaveBeenCalledWith('e1', 'x1', { status: 'PAID' }));
    await waitFor(() => expect(listEventExpenses).toHaveBeenCalledTimes(2));
});

test('a new expense is saved with its category, amount, payee and whether it is already paid', async () => {
    jest.mocked(listPayees).mockResolvedValue({ data: [{ id: 'p2', firstName: 'Bo', lastName: 'Lind', displayName: 'Bo Lind', email: 'bo@example.test', status: 'ACTIVE', roles: [] }], total: 1 });
    renderExpenses();
    const form = await screen.findByRole('form', { name: 'Add an expense' });

    fireEvent.change(within(form).getByLabelText('Category'), { target: { value: 'SALARY' } });
    fireEvent.change(within(form).getByLabelText('Amount'), { target: { value: '1250,50' } });
    fireEvent.change(within(form).getByLabelText('Find the choreographer or staff member to pay'), { target: { value: 'bo' } });
    await within(form).findByRole('option', { name: /Bo Lind/ });
    fireEvent.change(within(form).getByLabelText('Paid to'), { target: { value: 'p2' } });
    fireEvent.click(within(form).getByLabelText('Already paid'));
    fireEvent.submit(form);

    await waitFor(() => expect(createEventExpense).toHaveBeenCalledWith('e1', { category: 'SALARY', amount: '1250.50', description: null, expenseDate: null, personId: 'p2', status: 'PAID' }));
    await waitFor(() => expect(listEventExpenses).toHaveBeenCalledTimes(2));
});

test('an expense without an amount is not sent, and a viewer without the right gets no form or buttons', async () => {
    const { unmount } = renderExpenses();
    const form = await screen.findByRole('form', { name: 'Add an expense' });
    fireEvent.submit(form);
    expect(await within(form).findByRole('alert')).toHaveTextContent('Enter a category and an amount greater than zero');
    expect(createEventExpense).not.toHaveBeenCalled();
    unmount();

    renderExpenses(false);
    await screen.findByRole('link', { name: 'Anna Berg' });
    expect(screen.queryByRole('form', { name: 'Add an expense' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark paid' })).not.toBeInTheDocument();
});

test('the page of a person shows what events planned for and paid to them, with a link to the event', async () => {
    jest.mocked(listPersonExpenses).mockResolvedValue(list([line('x1', { status: 'PAID' })]));
    render(<MemoryRouter><PersonExpenses personId="p1" /></MemoryRouter>);

    const block = await screen.findByRole('region', { name: 'Payments and expenses from events' });
    expect(await within(block).findByRole('link', { name: 'Dance Camp' })).toHaveAttribute('href', '/events/e1');
    expect(listPersonExpenses).toHaveBeenCalledWith('p1');
});

test('the amount, date and description of an expense can be corrected', async () => {
    renderExpenses();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const form = screen.getByRole('form', { name: 'Edit expense' });
    fireEvent.change(within(form).getByLabelText('Amount'), { target: { value: '500,50' } });
    fireEvent.change(within(form).getByLabelText('Description'), { target: { value: 'Front desk, two days' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateEventExpense).toHaveBeenCalledWith('e1', 'x1', { category: 'SALARY', amount: '500.50', description: 'Front desk, two days', expenseDate: '2027-05-21', personId: 'p1' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Edit expense' })).not.toBeInTheDocument());
});

test('an expense is deleted only after a second press, and only an expense of the event itself', async () => {
    renderExpenses();

    expect(await screen.findAllByRole('button', { name: /^Delete expense/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Delete expense/ }));
    expect(deleteEventExpense).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));

    await waitFor(() => expect(deleteEventExpense).toHaveBeenCalledWith('e1', 'x1'));
    await waitFor(() => expect(listEventExpenses).toHaveBeenCalledTimes(2));
});

test('a search that finds no choreographer or staff member says who can be paid', async () => {
    renderExpenses();

    const form = await screen.findByRole('form', { name: 'Add an expense' });
    fireEvent.change(within(form).getByLabelText('Find the choreographer or staff member to pay'), { target: { value: 'anna' } });
    expect(await within(form).findByRole('status')).toHaveTextContent(/only to them/);
    expect(listPayees).toHaveBeenCalledWith('anna');
});
