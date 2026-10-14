import { ExpenseLine } from '@/entities/EventExpense';
import { payeeOf, readExpense, readExpenseEdit, readPayee } from './expenseForm';

const line = (change: Partial<ExpenseLine> = {}): ExpenseLine => ({
    id: 'x1', source: 'EVENT', category: 'FEE', description: null, amount: '10.00', currency: 'EUR', status: 'PLANNED', date: null, person: null, ...change,
});

const formOf = (fields: Record<string, string>) => {
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.set(name, value));
    return form;
};

test('the payee of an expense is named by its team role first, then by its person', () => {
    expect(payeeOf(line({ teamMember: { id: 'm1', roleTitle: 'Host' }, person: { id: 'p1', displayName: 'Anna' } }))).toBe('member:m1');
    expect(payeeOf(line({ person: { id: 'p1', displayName: 'Anna' } }))).toBe('person:p1');
    expect(payeeOf(line())).toBe('');
    expect(payeeOf()).toBe('');
});

test('pay for a role names the role; another payee or nobody takes the expense off it', () => {
    expect(readPayee('member:m1')).toEqual({ teamMemberId: 'm1' });
    expect(readPayee('person:p1')).toEqual({ personId: 'p1' });
    expect(readPayee('')).toEqual({ personId: null });
});

test('a corrected expense is read with a point in the amount and empty fields as nothing', () => {
    const form = formOf({ category: 'VENUE', amount: ' 1200,50 ', description: ' ', expenseDate: '', payee: 'person:p1' });

    expect(readExpenseEdit(form)).toEqual({ category: 'VENUE', amount: '1200.50', description: null, expenseDate: null, personId: 'p1' });
});

test('a new expense is paid only when the box says so', () => {
    const fields = { category: 'FEE', amount: '10', payee: '' };

    expect(readExpense(formOf(fields)).status).toBe('PLANNED');
    expect(readExpense(formOf({ ...fields, paid: 'on' })).status).toBe('PAID');
});
