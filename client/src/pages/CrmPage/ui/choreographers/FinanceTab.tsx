import { FormEvent, memo, ReactNode, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    cancelChoreographerExpense, cancelFeeAgreement, ChoreographerExpense, CurrencyTotals, EXPENSE_CATEGORIES, EXPENSE_PAYERS, FEE_STATUSES, FeeAgreement,
    FinanceAssignment, getChoreographerFinance, movePayout, PAYOUT_TYPES, PayoutRecord, PayoutStatus, recordChoreographerExpense, recordFeeAgreement, recordPayout,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import { PersonExpenses } from '../PersonExpenses';
import own from './Choreographers.module.scss';

export interface FinanceRights { canWrite: boolean; canConfirm: boolean }
// Resolves to true when the server accepted the change, so a form is cleared only then.
type Run = (work: () => Promise<unknown>) => Promise<boolean>;

const money = (amount: string | null, currency: string) => (amount === null ? '—' : `${amount} ${currency}`);
const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

// One row per currency: nothing is ever summed across currencies.
const TotalsTable = memo(({ totals }: { totals: CurrencyTotals[] }) => {
    const { t } = useTranslation();
    if (!totals.length) return <p className={cls.muted}>{t('No financial records yet.')}</p>;
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Agreed fee')}</th><th>{t('Expenses, planned')}</th><th>{t('Expenses, actual')}</th>
            <th>{t('Payments confirmed')}</th><th>{t('Fee outstanding')}</th><th>{t('Organizer total cost')}</th>
        </tr></thead>
        <tbody>{totals.map((row) => <tr key={row.currency}>
            <td>{money(row.agreedFee, row.currency)}</td><td>{money(row.estimatedExpenses, row.currency)}</td><td>{money(row.actualExpenses, row.currency)}</td>
            <td>{money(row.confirmedPayments, row.currency)}</td><td>{money(row.outstandingFee, row.currency)}</td><td>{money(row.organizerTotalCost, row.currency)}</td>
        </tr>)}</tbody>
    </table></div>;
});

const LedgerRow = memo(({ title, detail, status, children }: { title: string; detail: string; status: string; children?: ReactNode }) => <div className={cls.row}>
    <span><strong>{title}</strong><div className={own.secondary}>{detail}</div></span>
    <span className={cls.actions}><StatusBadge status={status} />{children}</span>
</div>);

const Agreements = memo(({ items, rights, run }: { items: FeeAgreement[]; rights: FinanceRights; run: Run }) => {
    const { t } = useTranslation();
    return <>{items.map((item) => <LedgerRow key={item.id} title={money(item.amount, item.currency)} status={item.status}
        detail={[new Date(item.createdAt).toLocaleDateString(), item.notes].filter(Boolean).join(' · ')}>
        {rights.canWrite && ['PROPOSED', 'COUNTERED', 'AGREED'].includes(item.status)
            && <Button aria-label={`${t('Cancel entry')}: ${money(item.amount, item.currency)}`} onClick={() => void run(() => cancelFeeAgreement(item.id))}>{t('Cancel entry')}</Button>}
    </LedgerRow>)}</>;
});

const expenseDetail = (item: ChoreographerExpense, t: (key: string) => string) => [
    item.estimatedAmount !== null ? `${t('planned')} ${money(item.estimatedAmount, item.currency)}` : '',
    `${t('Paid by')}: ${t(`PAYER_${item.paidBy}`)}`, item.reimbursable ? t('reimbursable') : '', item.description,
].filter(Boolean).join(' · ');

const Expenses = memo(({ items, rights, run }: { items: ChoreographerExpense[]; rights: FinanceRights; run: Run }) => {
    const { t } = useTranslation();
    return <>{items.map((item) => <LedgerRow key={item.id} status={item.status} detail={expenseDetail(item, t)}
        title={`${t(`EXPENSE_${item.type}`)}: ${money(item.actualAmount ?? item.estimatedAmount, item.currency)}`}>
        {rights.canWrite && item.status !== 'CANCELLED' && <Button onClick={() => void run(() => cancelChoreographerExpense(item.id))}>{t('Cancel entry')}</Button>}
    </LedgerRow>)}</>;
});

// What a payment may become next, and who may do it: confirming needs its own permission.
export const payoutActions = (status: PayoutStatus, rights: FinanceRights): PayoutStatus[] => {
    const next: Record<PayoutStatus, PayoutStatus[]> = {
        PLANNED: ['PENDING', 'CONFIRMED', 'CANCELLED'], PENDING: ['CONFIRMED', 'FAILED', 'CANCELLED'], FAILED: ['PENDING', 'CANCELLED'], CONFIRMED: ['CANCELLED'], CANCELLED: [],
    };
    if (!rights.canWrite) return [];
    return next[status].filter((target) => rights.canConfirm || (target !== 'CONFIRMED' && status !== 'CONFIRMED'));
};

const Payments = memo(({ items, rights, run }: { items: PayoutRecord[]; rights: FinanceRights; run: Run }) => {
    const { t } = useTranslation();
    return <>{items.map((item) => <LedgerRow key={item.id} status={item.status} title={`${t(`PAYOUT_${item.type}`)}: ${money(item.amount, item.currency)}`}
        detail={[item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : '', item.reference].filter(Boolean).join(' · ')}>
        {payoutActions(item.status, rights).map((target) => <Button key={target} aria-label={`${t(`MOVE_${target}`)}: ${money(item.amount, item.currency)}`}
            onClick={() => void run(() => movePayout(item.id, target))}>{t(`MOVE_${target}`)}</Button>)}
    </LedgerRow>)}</>;
});

const AmountFields = memo(({ amountLabel = 'Amount' }: { amountLabel?: string }) => <>
    <Field label={amountLabel}><input name="amount" inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" /></Field>
    <Field label="Currency"><input name="currency" required maxLength={3} defaultValue="EUR" /></Field>
</>);

const FeeForm = memo(({ assignmentId, run }: { assignmentId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        void run(() => recordFeeAgreement(assignmentId, { status: text(form, 'status'), amount: text(form, 'amount'), currency: text(form, 'currency'), notes: text(form, 'notes') })).then((saved) => { if (saved) element.reset(); });
    };
    return <form className={cls.grid} onSubmit={submit} aria-label={t('Record fee')}>
        <Field label="Negotiation step"><select name="status" defaultValue="PROPOSED">{FEE_STATUSES.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></Field>
        <AmountFields />
        <Field label="Note"><input name="notes" maxLength={500} /></Field>
        <div className={cls.wide}><Button type="submit">{t('Record fee')}</Button></div>
    </form>;
});

const ExpenseForm = memo(({ assignmentId, run }: { assignmentId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        void run(() => recordChoreographerExpense(assignmentId, {
            category: text(form, 'category'), currency: text(form, 'currency'), estimatedAmount: text(form, 'estimatedAmount') || null, actualAmount: text(form, 'actualAmount') || null,
            paidBy: text(form, 'paidBy'), reimbursable: form.get('reimbursable') === 'on', description: text(form, 'description'),
        })).then((saved) => { if (saved) element.reset(); });
    };
    return <form className={cls.grid} onSubmit={submit} aria-label={t('Record expense')}>
        <Field label="Expense type"><select name="category" defaultValue="TRAVEL">{EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{t(`EXPENSE_${item}`)}</option>)}</select></Field>
        <Field label="Planned amount"><input name="estimatedAmount" inputMode="decimal" /></Field>
        <Field label="Actual amount"><input name="actualAmount" inputMode="decimal" /></Field>
        <Field label="Currency"><input name="currency" required maxLength={3} defaultValue="EUR" /></Field>
        <Field label="Paid by"><select name="paidBy" defaultValue="ORGANIZER">{EXPENSE_PAYERS.map((item) => <option key={item} value={item}>{t(`PAYER_${item}`)}</option>)}</select></Field>
        <label className={cls.check}><input name="reimbursable" type="checkbox" />{t('Reimbursed to the choreographer')}</label>
        <div className={cls.wide}><Field label="Description"><input name="description" maxLength={500} /></Field></div>
        <div className={cls.wide}><Button type="submit">{t('Record expense')}</Button></div>
    </form>;
});

const PaymentForm = memo(({ assignmentId, run }: { assignmentId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        void run(() => recordPayout(assignmentId, { type: text(form, 'type'), amount: text(form, 'amount'), currency: text(form, 'currency'), status: 'PLANNED', reference: text(form, 'reference') })).then((saved) => { if (saved) element.reset(); });
    };
    return <form className={cls.grid} onSubmit={submit} aria-label={t('Record payment')}>
        <Field label="Payment type"><select name="type" defaultValue="FEE">{PAYOUT_TYPES.map((item) => <option key={item} value={item}>{t(`PAYOUT_${item}`)}</option>)}</select></Field>
        <AmountFields />
        <Field label="Reference"><input name="reference" maxLength={200} /></Field>
        <div className={cls.wide}><Button type="submit">{t('Record payment')}</Button></div>
    </form>;
});

const AssignmentLedger = memo(({ assignment, rights, run }: { assignment: FinanceAssignment; rights: FinanceRights; run: Run }) => {
    const { t } = useTranslation();
    return <article className={own.assignment} aria-label={assignment.event.name}>
        <Link to={`/events/${assignment.event.id}`}>{assignment.event.name}</Link>
        <TotalsTable totals={assignment.totals} />
        <h3>{t('Fee negotiation')}</h3>
        <Agreements items={assignment.agreements} rights={rights} run={run} />
        {rights.canWrite && <FeeForm assignmentId={assignment.id} run={run} />}
        <h3>{t('Expenses')}</h3>
        <Expenses items={assignment.expenses} rights={rights} run={run} />
        {rights.canWrite && <ExpenseForm assignmentId={assignment.id} run={run} />}
        <h3>{t('Payments to the choreographer')}</h3>
        <Payments items={assignment.payments} rights={rights} run={run} />
        {rights.canWrite && <PaymentForm assignmentId={assignment.id} run={run} />}
    </article>;
});

export const FinanceTab = memo(({ personId, rights }: { personId: string; rights: FinanceRights }) => {
    const { t } = useTranslation();
    const load = useCallback(() => getChoreographerFinance(personId), [personId]);
    const finance = useResource(load);
    const [error, setError] = useState('');
    // Financial changes are shown only after the server confirmed them: the ledger is reloaded.
    const run: Run = async (work) => {
        setError('');
        try { await work(); await finance.refresh(); return true; }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); return false; }
    };
    return <>
        <RequestState error={error || finance.error} loading={finance.loading && !finance.data} />
        {finance.data?.years.map(({ year, totals }) => <section className={cls.panel} key={year} aria-label={`${t('Finance')} ${year}`}>
            <h2>{year}</h2>
            <TotalsTable totals={totals} />
            {finance.data?.assignments.filter((item) => item.year === year).map((item) => <AssignmentLedger key={item.id} assignment={item} rights={rights} run={run} />)}
        </section>)}
        {finance.data?.assignments.length === 0 && <section className={cls.panel}><p className={cls.muted}>{t('Finance is recorded per event. Add the choreographer to an event first.')}</p></section>}
        <PersonExpenses personId={personId} />
    </>;
});
