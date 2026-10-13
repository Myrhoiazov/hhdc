import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    createEventExpense, deleteEventExpense, EVENT_EXPENSE_CATEGORIES, EventExpenseCategory, EventExpenseInput, ExpenseLine, ExpenseList, ExpenseStatus, listEventExpenses, listEventTeam, listPayees, TeamMember, updateEventExpense,
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

type ExpenseEdit = Pick<EventExpenseInput, 'category' | 'amount' | 'description' | 'expenseDate' | 'personId' | 'teamMemberId'>;
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
        <td className={`${own.secondary} ${own.whole}`}>{line.date ? new Date(line.date).toLocaleDateString() : '—'}</td>
        <td>{text.category(line.category)}</td>
        <td>{line.person ? <Link className={own.name} to={`/people/${line.person.id}`}>{line.person.displayName}</Link> : '—'}
            {line.teamMember && <span className={form.role}>{line.teamMember.roleTitle}</span>}</td>
        <td className={`${own.secondary} ${own.optional}`}>{line.description || (own_ ? '—' : t("From the choreographer's card"))}</td>
        <td className={own.number}>{text.money(line.amount)}</td>
        <td><span className={cls.badge}>{text.status(line.status)}</span></td>
        <td>{own_ && actions.canEdit
            ? <RowButtons line={line} {...actions} />
            : !own_ && <span className={own.secondary}>{t("From the choreographer's card")}</span>}</td>
    </tr>;
});

const COLUMNS = 7;

interface EditProps { line: ExpenseLine; team: TeamMember[]; busy: boolean; onSave: (line: ExpenseLine, change: ExpenseEdit) => void; onCancel: () => void }

// The row of an expense being corrected: category, amount, date, who it is paid to and the
// description. Whether it is paid is changed with the buttons of the row.
const ExpenseEditRow = memo(({ line, team, busy, onSave, onCancel }: EditProps) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const change = readExpenseEdit(new FormData(event.currentTarget));
        if (!(Number(change.amount) > 0)) { setError(t('Enter a category and an amount greater than zero')); return; }
        onSave(line, change);
    };
    return <tr><td colSpan={COLUMNS}><form className={form.fields} onSubmit={submit} aria-label={t('Edit expense')}>
        <Field label="Category"><select name="category" defaultValue={line.category}>{EVENT_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{text.category(category)}</option>)}</select></Field>
        <Field label="Amount"><input name="amount" inputMode="decimal" autoComplete="off" defaultValue={line.amount} required /></Field>
        <Field label="Date"><input name="expenseDate" type="date" defaultValue={line.date ?? ''} /></Field>
        <PayeeFields team={team} current={line} />
        <div className={form.wide}><Field label="Description"><input name="description" maxLength={500} defaultValue={line.description ?? ''} /></Field></div>
        {error && <p role="alert" className={cls.error}>{error}</p>}
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Save')}</Button><Button disabled={busy} onClick={onCancel}>{t('Cancel')}</Button></div>
    </form></td></tr>;
});

interface TableProps extends RowActions { lines: ExpenseLine[]; team: TeamMember[]; editingId: string; onSave: EditProps['onSave']; onCancel: () => void }

const ExpensesTable = memo(({ lines, team, editingId, onSave, onCancel, ...actions }: TableProps) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Date')}</th><th>{t('Category')}</th><th>{t('Paid to')}</th><th className={own.optional}>{t('Description')}</th>
            <th className={own.number}>{t('Amount')}</th><th>{t('Status')}</th><th aria-label={t('Actions')} />
        </tr></thead>
        <tbody>{lines.map(line => (line.source === 'EVENT' && line.id === editingId
            ? <ExpenseEditRow key={`edit-${line.id}`} line={line} team={team} busy={actions.busy} onSave={onSave} onCancel={onCancel} />
            : <ExpenseRow key={`${line.source}-${line.id}`} line={line} {...actions} />))}</tbody>
    </table></div>;
});

// A payee outside the team is found by typing among choreographers, staff and partners: an expense is paid to somebody who works on the event.
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

// The payee as the form names it: a role in the team of the event, any other person, or nobody.
const MEMBER = 'member:';
const PERSON = 'person:';
const payeeOf = (line?: ExpenseLine) => {
    if (line?.teamMember) return `${MEMBER}${line.teamMember.id}`;
    return line?.person ? `${PERSON}${line.person.id}` : '';
};
// Pay for a role names the role and the server names the person; another payee takes the expense off the role.
const readPayee = (value: string): Pick<EventExpenseInput, 'personId' | 'teamMemberId'> => {
    if (value.startsWith(MEMBER)) return { teamMemberId: value.slice(MEMBER.length) };
    return { personId: value.startsWith(PERSON) ? value.slice(PERSON.length) : null };
};

// Who the expense is paid to. The team of the event is offered first; anybody else is looked for
// by typing. `current` is the expense being corrected: its payee is offered so that it is kept.
const PayeeFields = memo(({ team, current }: { team: TeamMember[]; current?: ExpenseLine }) => {
    const { t } = useTranslation();
    const payee = usePayeeSearch();
    const kept = current?.person && !current.teamMember ? current.person : null;
    const found = (payee.found.data?.data ?? []).filter(person => person.id !== kept?.id);
    return <>
        <Field label="Find a payee outside the team"><input type="search" value={payee.search} onChange={event => payee.setSearch(event.target.value)} /></Field>
        <div className={form.wide}><Field label="Paid to"><select name="payee" defaultValue={payeeOf(current)}>
            <option value="">{t('Nobody (a cost of the event itself)')}</option>
            {team.length > 0 && <optgroup label={t('Team of the event')}>
                {team.map(member => <option key={member.id} value={`${MEMBER}${member.id}`}>{`${member.person.displayName} — ${member.roleTitle}`}</option>)}
            </optgroup>}
            {kept && <option value={`${PERSON}${kept.id}`}>{kept.displayName}</option>}
            {found.map(person => <option key={person.id} value={`${PERSON}${person.id}`}>{payeeLabel(person)}</option>)}
        </select></Field></div>
        {payee.nobody && <p className={`${form.wide} ${cls.muted}`} role="status">{t('Nobody found among choreographers, staff and partners. An expense can be paid only to them: add the person to the team of the event or give the role on the page of the person first.')}</p>}
    </>;
});

// What can be corrected in an expense; whether it is paid is changed with the buttons of the row.
const readExpenseEdit = (form: FormData): ExpenseEdit => ({
    category: String(form.get('category') ?? '') as EventExpenseCategory,
    amount: String(form.get('amount') ?? '').trim().replace(',', '.'),
    description: String(form.get('description') ?? '').trim() || null,
    expenseDate: String(form.get('expenseDate') ?? '') || null,
    ...readPayee(String(form.get('payee') ?? '')),
});

const readExpense = (form: FormData) => ({ ...readExpenseEdit(form), status: (form.get('paid') ? 'PAID' : 'PLANNED') as ExpenseStatus });

const AddExpense = memo(({ eventId, team, onSaved }: { eventId: string; team: TeamMember[]; onSaved: () => void }) => {
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
            <p className={cls.muted}>{t("A fee, a salary, the venue, travel — anything the event costs. Choose who it is paid to — somebody from the team, a choreographer or a partner — and the amount appears on that person's page.")}</p></div>
        <div className={form.fields}>
            <Field label="Category"><select name="category" defaultValue="FEE">{EVENT_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{text.category(category)}</option>)}</select></Field>
            <Field label="Amount"><input name="amount" inputMode="decimal" autoComplete="off" required /></Field>
            <Field label="Date"><input name="expenseDate" type="date" /></Field>
            <PayeeFields key={formKey} team={team} />
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
// The team of the event, for choosing whom an expense is paid to; nobody who cannot change expenses needs it.
const NO_TEAM: TeamMember[] = [];
const usePayeeTeam = (eventId: string, canEdit: boolean, version: number) => {
    const load = useCallback(() => (canEdit ? listEventTeam(eventId) : Promise.resolve(NO_TEAM)), [eventId, canEdit, version]); // eslint-disable-line react-hooks/exhaustive-deps
    return useResource(load).data ?? NO_TEAM;
};

interface EventExpensesProps { eventId: string; canEdit: boolean; version?: number; onChanged?: () => void }

// `version` changes when the team of the event does: a new member comes with pay, which is an expense.
export const EventExpenses = memo(({ eventId, canEdit, version = 0, onChanged }: EventExpensesProps) => {
    const { t } = useTranslation();
    const load = useCallback(() => listEventExpenses(eventId), [eventId, version]); // eslint-disable-line react-hooks/exhaustive-deps
    const expenses = useResource(load);
    const team = usePayeeTeam(eventId, canEdit, version);
    const refresh = useCallback(() => { void expenses.refresh(); onChanged?.(); }, [expenses, onChanged]);
    const changes = useExpenseChanges(eventId, refresh);
    const { data } = expenses;
    return <section id="event-expenses" className={cls.panel} aria-label={t('Expenses')}>
        <h2>{t('Expenses')}</h2>
        <RequestState error={expenses.error || changes.error} loading={expenses.loading && !data} />
        {data && data.lines.length > 0 && <>
            <ExpenseTotals totals={data.totals} />
            <ExpensesTable lines={data.lines} team={team} canEdit={canEdit} busy={changes.busy} editingId={changes.editingId} onStatus={changes.setStatus}
                onEdit={changes.edit} onDelete={changes.remove} onSave={changes.save} onCancel={changes.cancel} />
            {data.lines.some(line => line.source !== 'EVENT') && <p className={cls.muted}>{t("Expenses and fees kept on a choreographer's card are counted here too and are changed there.")}</p>}
        </>}
        {data?.lines.length === 0 && <p className={cls.muted}>{t('No expenses recorded for this event yet')}</p>}
        {canEdit && <AddExpense eventId={eventId} team={team} onSaved={refresh} />}
    </section>;
});
