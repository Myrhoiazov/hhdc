import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    createEventExpense, deleteEventExpense, EVENT_EXPENSE_CATEGORIES, EventExpenseCategory, EventExpenseInput, ExpenseLine, ExpenseList, ExpenseStatus, listEventExpenses, listPayees, updateEventExpense,
} from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, useNumbers } from './common';
import { ConfirmDelete, listStyles as own, useDelayed } from './ListTable';
import cls from './CrmPage.module.scss';
import form from './EventExpenses.module.scss';

const MIN_SEARCH = 2;

export const useExpenseText = (currency = 'EUR') => {
    const { t } = useTranslation();
    const { money } = useNumbers(currency);
    return {
        money,
        category: (category: string) => t(`Expense: ${category}`, { defaultValue: category }),
        status: (status: string) => t(`Expense status: ${status}`, { defaultValue: status }),
    };
};

export const ExpenseTotals = memo(({ totals }: { totals: ExpenseList['totals'] }) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    return <div className={form.totals}>
        <p><strong>{t('Total: {{total}} · paid: {{paid}} · still to pay: {{planned}}', { total: text.money(totals.total), paid: text.money(totals.paid), planned: text.money(totals.planned) })}</strong></p>
        {totals.byCategory.length > 0 && <p className={cls.muted}>{totals.byCategory.map(item => `${text.category(item.category)}: ${text.money(item.amount)}`).join(' · ')}</p>}
    </div>;
});

// What can be done with an expense of the event; a line from a choreographer's card is changed there.
const NEXT_STATUS: Record<string, Array<[ExpenseStatus, string]>> = {
    PLANNED: [['PAID', 'Mark paid'], ['CANCELLED', 'Cancel expense']], PAID: [['CANCELLED', 'Cancel expense']], CANCELLED: [['PLANNED', 'Restore']],
};

type ExpenseEdit = Pick<EventExpenseInput, 'category' | 'amount' | 'description' | 'expenseDate' | 'personId'>;
interface RowActions { canEdit: boolean; busy: boolean; onStatus: (line: ExpenseLine, status: ExpenseStatus) => void; onEdit: (line: ExpenseLine) => void; onDelete: (line: ExpenseLine) => Promise<void> }

const RowButtons = memo(({ line, busy, onStatus, onEdit, onDelete }: RowActions & { line: ExpenseLine }) => {
    const { t } = useTranslation();
    const text = useExpenseText(line.currency);
    return <span className={cls.actions}>
        {(NEXT_STATUS[line.status] ?? []).map(([status, label]) => <Button key={status} disabled={busy} onClick={() => onStatus(line, status)}>{t(label)}</Button>)}
        <Button disabled={busy} onClick={() => onEdit(line)}>{t('Edit')}</Button>
        <ConfirmDelete label={t('Delete expense {{amount}}', { amount: text.money(line.amount) })} onDelete={() => onDelete(line)} />
    </span>;
});

const ExpenseRow = memo(({ line, ...actions }: RowActions & { line: ExpenseLine }) => {
    const { t } = useTranslation();
    const text = useExpenseText(line.currency);
    const own_ = line.source === 'EVENT';
    return <tr>
        <td className={own.secondary}>{line.date ? new Date(line.date).toLocaleDateString() : '—'}</td>
        <td>{text.category(line.category)}</td>
        <td>{line.person ? <Link className={own.name} to={`/people/${line.person.id}`}>{line.person.displayName}</Link> : '—'}</td>
        <td className={`${own.secondary} ${own.optional}`}>{line.description || (own_ ? '—' : t("From the choreographer's card"))}</td>
        <td className={own.number}>{text.money(line.amount)}</td>
        <td><span className={cls.badge}>{text.status(line.status)}</span></td>
        <td>{own_ && actions.canEdit
            ? <RowButtons line={line} {...actions} />
            : !own_ && <span className={own.secondary}>{t("From the choreographer's card")}</span>}</td>
    </tr>;
});

const COLUMNS = 7;

interface EditProps { line: ExpenseLine; busy: boolean; onSave: (line: ExpenseLine, change: ExpenseEdit) => void; onCancel: () => void }

// The row of an expense being corrected: category, amount, date, who it is paid to and the
// description. Whether it is paid is changed with the buttons of the row.
const ExpenseEditRow = memo(({ line, busy, onSave, onCancel }: EditProps) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { category, amount, description, expenseDate, personId } = readExpense(new FormData(event.currentTarget));
        if (!(Number(amount) > 0)) { setError(t('Enter a category and an amount greater than zero')); return; }
        onSave(line, { category, amount, description, expenseDate, personId });
    };
    return <tr><td colSpan={COLUMNS}><form className={form.fields} onSubmit={submit} aria-label={t('Edit expense')}>
        <Field label="Category"><select name="category" defaultValue={line.category}>{EVENT_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{text.category(category)}</option>)}</select></Field>
        <Field label="Amount"><input name="amount" inputMode="decimal" autoComplete="off" defaultValue={line.amount} required /></Field>
        <Field label="Date"><input name="expenseDate" type="date" defaultValue={line.date ?? ''} /></Field>
        <PayeeFields current={line.person} />
        <div className={form.wide}><Field label="Description"><input name="description" maxLength={500} defaultValue={line.description ?? ''} /></Field></div>
        {error && <p role="alert" className={cls.error}>{error}</p>}
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Save')}</Button><Button disabled={busy} onClick={onCancel}>{t('Cancel')}</Button></div>
    </form></td></tr>;
});

interface TableProps extends RowActions { lines: ExpenseLine[]; editingId: string; onSave: EditProps['onSave']; onCancel: () => void }

const ExpensesTable = memo(({ lines, editingId, onSave, onCancel, ...actions }: TableProps) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Date')}</th><th>{t('Category')}</th><th>{t('Paid to')}</th><th className={own.optional}>{t('Description')}</th>
            <th className={own.number}>{t('Amount')}</th><th>{t('Status')}</th><th aria-label={t('Actions')} />
        </tr></thead>
        <tbody>{lines.map(line => (line.source === 'EVENT' && line.id === editingId
            ? <ExpenseEditRow key={`edit-${line.id}`} line={line} busy={actions.busy} onSave={onSave} onCancel={onCancel} />
            : <ExpenseRow key={`${line.source}-${line.id}`} line={line} {...actions} />))}</tbody>
    </table></div>;
});

// The payee is found by typing among choreographers and staff: an expense is paid to somebody who works on the event.
const usePayeeSearch = () => {
    const [search, setSearch] = useState('');
    const q = useDelayed(search);
    const load = useCallback(() => (q.trim().length >= MIN_SEARCH ? listPayees(q.trim()) : Promise.resolve({ data: [], total: 0 })), [q]);
    const found = useResource(load);
    // Somebody was looked for and nobody with the right role was found.
    const nobody = q.trim().length >= MIN_SEARCH && !found.loading && found.data?.total === 0;
    return { search, setSearch, found, nobody };
};

const payeeLabel = (person: { displayName?: string; firstName: string; lastName: string; email?: string | null }) =>
    `${person.displayName || `${person.firstName} ${person.lastName}`} · ${person.email ?? '—'}`;

// Who the expense is paid to: looked for by typing, chosen from what was found. `current` is the
// payee an expense already has, offered first so that correcting an expense keeps it.
const PayeeFields = memo(({ current }: { current?: ExpenseLine['person'] }) => {
    const { t } = useTranslation();
    const payee = usePayeeSearch();
    const found = (payee.found.data?.data ?? []).filter(person => person.id !== current?.id);
    return <>
        <Field label="Find the choreographer or staff member to pay"><input type="search" value={payee.search} onChange={event => payee.setSearch(event.target.value)} /></Field>
        <div className={form.wide}><Field label="Paid to"><select name="personId" defaultValue={current?.id ?? ''}>
            <option value="">{t('Nobody (a cost of the event itself)')}</option>
            {current && <option value={current.id}>{current.displayName}</option>}
            {found.map(person => <option key={person.id} value={person.id}>{payeeLabel(person)}</option>)}
        </select></Field></div>
        {payee.nobody && <p className={`${form.wide} ${cls.muted}`} role="status">{t('Nobody found among choreographers and staff. An expense can be paid only to them: add the role on the page of the person first.')}</p>}
    </>;
});

const readExpense = (form: FormData) => ({
    category: String(form.get('category') ?? '') as EventExpenseCategory,
    amount: String(form.get('amount') ?? '').trim().replace(',', '.'),
    description: String(form.get('description') ?? '').trim() || null,
    expenseDate: String(form.get('expenseDate') ?? '') || null,
    personId: String(form.get('personId') ?? '') || null,
    status: (form.get('paid') ? 'PAID' : 'PLANNED') as ExpenseStatus,
});

const AddExpense = memo(({ eventId, onSaved }: { eventId: string; onSaved: () => void }) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    const [error, setError] = useState('');
    // A saved expense empties the form, the payee search included.
    const [formKey, setFormKey] = useState(0);
    const action = useAction(onSaved);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const input = readExpense(new FormData(element));
        if (!input.category || !(Number(input.amount) > 0)) { setError(t('Enter a category and an amount greater than zero')); return; }
        setError('');
        if (await action.run(() => createEventExpense(eventId, input))) { element.reset(); setFormKey(key => key + 1); }
    };
    return <form className={form.form} onSubmit={event => void submit(event)} aria-label={t('Add an expense')}>
        <div className={form.intro}><h3>{t('Add an expense')}</h3>
            <p className={cls.muted}>{t("A fee, a salary, the venue, travel — anything the event costs. Choose the choreographer or staff member it is paid to and the amount appears on that person's page.")}</p></div>
        <div className={form.fields}>
            <Field label="Category"><select name="category" defaultValue="FEE">{EVENT_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{text.category(category)}</option>)}</select></Field>
            <Field label="Amount"><input name="amount" inputMode="decimal" autoComplete="off" required /></Field>
            <Field label="Date"><input name="expenseDate" type="date" /></Field>
            <PayeeFields key={formKey} />
            <div className={form.wide}><Field label="Description"><input name="description" maxLength={500} /></Field></div>
            <label className={form.paid}><input type="checkbox" name="paid" />{t('Already paid')}</label>
        </div>
        {(error || action.error) && <p role="alert" className={cls.error}>{error || action.error}</p>}
        <div className={cls.actions}><Button type="submit" disabled={action.busy}>{t('Save expense')}</Button></div>
    </form>;
});

// Changes of the expenses of one event: each is saved at once and the list is read again.
const useExpenseChanges = (eventId: string, refresh: () => void) => {
    const [editingId, setEditingId] = useState('');
    const done = useCallback(() => { setEditingId(''); refresh(); }, [refresh]);
    const action = useAction(done);
    return {
        editingId, busy: action.busy, error: action.error,
        edit: (line: ExpenseLine) => setEditingId(line.id), cancel: () => setEditingId(''),
        setStatus: (line: ExpenseLine, status: ExpenseStatus) => void action.run(() => updateEventExpense(eventId, line.id, { status })),
        save: (line: ExpenseLine, change: ExpenseEdit) => void action.run(() => updateEventExpense(eventId, line.id, change)),
        remove: async (line: ExpenseLine) => { await deleteEventExpense(eventId, line.id); done(); },
    };
};

// Everything the event costs in one place: what was entered here and what is kept on the cards
// of its choreographers. Every change is saved at once and reaches the finance pages by itself.
export const EventExpenses = memo(({ eventId, canEdit }: { eventId: string; canEdit: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listEventExpenses(eventId), [eventId]);
    const expenses = useResource(load);
    const refresh = useCallback(() => { void expenses.refresh(); }, [expenses]);
    const changes = useExpenseChanges(eventId, refresh);
    const { data } = expenses;
    return <section id="event-expenses" className={cls.panel} aria-label={t('Expenses')}>
        <h2>{t('Expenses')}</h2>
        <RequestState error={expenses.error || changes.error} loading={expenses.loading && !data} />
        {data && data.lines.length > 0 && <>
            <ExpenseTotals totals={data.totals} />
            <ExpensesTable lines={data.lines} canEdit={canEdit} busy={changes.busy} editingId={changes.editingId} onStatus={changes.setStatus}
                onEdit={changes.edit} onDelete={changes.remove} onSave={changes.save} onCancel={changes.cancel} />
            {data.lines.some(line => line.source !== 'EVENT') && <p className={cls.muted}>{t("Expenses and fees kept on a choreographer's card are counted here too and are changed there.")}</p>}
        </>}
        {data?.lines.length === 0 && <p className={cls.muted}>{t('No expenses recorded for this event yet')}</p>}
        {canEdit && <AddExpense eventId={eventId} onSaved={refresh} />}
    </section>;
});
