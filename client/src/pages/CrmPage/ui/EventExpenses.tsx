import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    createEventExpense, EVENT_EXPENSE_CATEGORIES, EventExpenseCategory, ExpenseLine, ExpenseList, ExpenseStatus, listEventExpenses, listPeople, updateEventExpense,
} from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState } from './common';
import { listStyles as own, useDelayed } from './ListTable';
import cls from './CrmPage.module.scss';
import form from './EventExpenses.module.scss';

const MIN_SEARCH = 2;

export const useExpenseText = (currency = 'EUR') => {
    const { t, i18n } = useTranslation();
    const format = new Intl.NumberFormat(i18n.language, { style: 'currency', currency });
    return {
        money: (amount: string) => format.format(Number(amount)),
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

interface RowProps { line: ExpenseLine; canEdit: boolean; busy: boolean; onStatus: (line: ExpenseLine, status: ExpenseStatus) => void }

const ExpenseRow = memo(({ line, canEdit, busy, onStatus }: RowProps) => {
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
        <td>{own_ && canEdit
            ? <span className={cls.actions}>{(NEXT_STATUS[line.status] ?? []).map(([status, label]) => <Button key={status} disabled={busy} onClick={() => onStatus(line, status)}>{t(label)}</Button>)}</span>
            : !own_ && <span className={own.secondary}>{t("From the choreographer's card")}</span>}</td>
    </tr>;
});

const ExpensesTable = memo(({ lines, ...rest }: Omit<RowProps, 'line'> & { lines: ExpenseLine[] }) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Date')}</th><th>{t('Category')}</th><th>{t('Paid to')}</th><th className={own.optional}>{t('Description')}</th>
            <th className={own.number}>{t('Amount')}</th><th>{t('Status')}</th><th aria-label={t('Actions')} />
        </tr></thead>
        <tbody>{lines.map(line => <ExpenseRow key={`${line.source}-${line.id}`} line={line} {...rest} />)}</tbody>
    </table></div>;
});

// The payee is found by typing: any person of the CRM can be paid, not only those already on the event.
const usePayeeSearch = () => {
    const [search, setSearch] = useState('');
    const q = useDelayed(search);
    const load = useCallback(() => (q.trim().length >= MIN_SEARCH ? listPeople(q.trim()) : Promise.resolve({ data: [], total: 0 })), [q]);
    return { search, setSearch, found: useResource(load) };
};

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
    const payee = usePayeeSearch();
    const [error, setError] = useState('');
    const action = useAction(onSaved);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const input = readExpense(new FormData(element));
        if (!input.category || !(Number(input.amount) > 0)) { setError(t('Enter a category and an amount greater than zero')); return; }
        setError('');
        if (await action.run(() => createEventExpense(eventId, input))) { element.reset(); payee.setSearch(''); }
    };
    return <form className={form.form} onSubmit={event => void submit(event)} aria-label={t('Add an expense')}>
        <div className={form.intro}><h3>{t('Add an expense')}</h3>
            <p className={cls.muted}>{t("A fee, a salary, the venue, travel — anything the event costs. Choose who it is paid to and the amount appears on that person's page.")}</p></div>
        <div className={form.fields}>
            <Field label="Category"><select name="category" defaultValue="FEE">{EVENT_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{text.category(category)}</option>)}</select></Field>
            <Field label="Amount"><input name="amount" inputMode="decimal" autoComplete="off" required /></Field>
            <Field label="Date"><input name="expenseDate" type="date" /></Field>
            <Field label="Find the person to pay"><input type="search" value={payee.search} onChange={event => payee.setSearch(event.target.value)} /></Field>
            <div className={form.wide}><Field label="Paid to"><select name="personId" defaultValue="">
                <option value="">{t('Nobody (a cost of the event itself)')}</option>
                {payee.found.data?.data.map(person => <option key={person.id} value={person.id}>{`${person.displayName || `${person.firstName} ${person.lastName}`} · ${person.email ?? '—'}`}</option>)}
            </select></Field></div>
            <div className={form.wide}><Field label="Description"><input name="description" maxLength={500} /></Field></div>
            <label className={form.paid}><input type="checkbox" name="paid" />{t('Already paid')}</label>
        </div>
        {(error || action.error) && <p role="alert" className={cls.error}>{error || action.error}</p>}
        <div className={cls.actions}><Button type="submit" disabled={action.busy}>{t('Save expense')}</Button></div>
    </form>;
});

// Everything the event costs in one place: what was entered here and what is kept on the cards
// of its choreographers. Every change is saved at once and reaches the finance pages by itself.
export const EventExpenses = memo(({ eventId, canEdit }: { eventId: string; canEdit: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listEventExpenses(eventId), [eventId]);
    const expenses = useResource(load);
    const refresh = useCallback(() => { void expenses.refresh(); }, [expenses]);
    const action = useAction(refresh);
    const setStatus = (line: ExpenseLine, status: ExpenseStatus) => void action.run(() => updateEventExpense(eventId, line.id, { status }));
    const { data } = expenses;
    return <section id="event-expenses" className={cls.panel} aria-label={t('Expenses')}>
        <h2>{t('Expenses')}</h2>
        <RequestState error={expenses.error || action.error} loading={expenses.loading && !data} />
        {data && data.lines.length > 0 && <>
            <ExpenseTotals totals={data.totals} />
            <ExpensesTable lines={data.lines} canEdit={canEdit} busy={action.busy} onStatus={setStatus} />
            {data.lines.some(line => line.source !== 'EVENT') && <p className={cls.muted}>{t("Expenses and fees kept on a choreographer's card are counted here too and are changed there.")}</p>}
        </>}
        {data?.lines.length === 0 && <p className={cls.muted}>{t('No expenses recorded for this event yet')}</p>}
        {canEdit && <AddExpense eventId={eventId} onSaved={refresh} />}
    </section>;
});
