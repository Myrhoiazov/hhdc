import {
    EventExpenseCategory,
    EventExpenseInput,
    ExpenseLine,
    ExpenseStatus,
} from '@/entities/EventExpense';

// What can be done with an expense of the event is the entity's rule (`nextExpenseActions`); a line
// from a choreographer's card is changed there.
export type ExpenseEdit = Pick<
    EventExpenseInput,
    'category' | 'amount' | 'description' | 'expenseDate' | 'personId' | 'teamMemberId'
>;

// The payee as the form names it: a role in the team of the event, any other person, or nobody.
export const MEMBER = 'member:';

export const PERSON = 'person:';

export const payeeOf = (line?: ExpenseLine) => {
    if (line?.teamMember) return `${MEMBER}${line.teamMember.id}`;
    return line?.person ? `${PERSON}${line.person.id}` : '';
};

// Pay for a role names the role and the server names the person; another payee takes the expense off the role.
export const readPayee = (value: string): Pick<EventExpenseInput, 'personId' | 'teamMemberId'> => {
    if (value.startsWith(MEMBER)) return { teamMemberId: value.slice(MEMBER.length) };
    return { personId: value.startsWith(PERSON) ? value.slice(PERSON.length) : null };
};

// What can be corrected in an expense; whether it is paid is changed with the buttons of the row.
export const readExpenseEdit = (form: FormData): ExpenseEdit => ({
    category: String(form.get('category') ?? '') as EventExpenseCategory,
    amount: String(form.get('amount') ?? '')
        .trim()
        .replace(',', '.'),
    description: String(form.get('description') ?? '').trim() || null,
    expenseDate: String(form.get('expenseDate') ?? '') || null,
    ...readPayee(String(form.get('payee') ?? '')),
});

export const readExpense = (form: FormData) => ({
    ...readExpenseEdit(form),
    status: (form.get('paid') ? 'PAID' : 'PLANNED') as ExpenseStatus,
});
