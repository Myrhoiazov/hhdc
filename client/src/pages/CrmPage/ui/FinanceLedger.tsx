import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Event, getLedgerSummary, LEDGER_CATEGORIES, LedgerCategory, LedgerCategoryTotal, LedgerEntry, LedgerFilters, LedgerSummary, listEvents, listLedgerPage } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge, useNumbers } from './common';
import { Bar, chartStyles, Tile } from './Charts';
import { REFUNDABLE, RefundRequestForm } from './FinanceRefunds';
import { listStyles as table, Pager, useListFilters } from './ListTable';
import cls from './CrmPage.module.scss';
import own from './FinanceLedger.module.scss';

export type LedgerView = 'dates' | 'categories';
const NO_FILTERS: LedgerFilters = { q: '', category: '', eventId: '', from: '', to: '' };

const useLedgerText = (currency = 'EUR') => {
    const { t } = useTranslation();
    const numbers = useNumbers(currency);
    return {
        ...numbers,
        // Money out is written with a minus, money in with a plus.
        signed: (amount: string, direction: 'IN' | 'OUT') => `${direction === 'IN' ? '+' : '−'}${numbers.money(amount)}`,
        category: (category: string) => t(`Ledger category: ${category}`, { defaultValue: category }),
    };
};

const useLedger = () => {
    const list = useListFilters(NO_FILTERS);
    const [view, setView] = useState<LedgerView>('dates');
    const { applied, page, change } = list;
    const loadList = useCallback(() => listLedgerPage(applied, page), [applied, page]);
    const loadSummary = useCallback(() => getLedgerSummary(applied), [applied]);
    const openCategory = (chosen: string) => { change({ category: chosen as LedgerCategory }); setView('dates'); };
    return { ...list, view, setView, openCategory, list: useResource(loadList), summary: useResource(loadSummary) };
};

interface FiltersProps { filters: LedgerFilters; events: Event[]; filtered: boolean; onChange: (patch: Partial<LedgerFilters>) => void; onReset: () => void }

const LedgerFiltersBar = memo(({ filters, events, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    const text = useLedgerText();
    return <div className={table.filters}>
        <div className={table.search}><Field label="Search by person, event or description"><input type="search" value={filters.q} onChange={event => onChange({ q: event.target.value })} /></Field></div>
        <Field label="Category"><select value={filters.category} onChange={event => onChange({ category: event.target.value as LedgerFilters['category'] })}>
            <option value="">{t('Any category')}</option>
            {LEDGER_CATEGORIES.map(category => <option key={category} value={category}>{text.category(category)}</option>)}
        </select></Field>
        <Field label="Event"><select value={filters.eventId} onChange={event => onChange({ eventId: event.target.value })}>
            <option value="">{t('Any event')}</option>
            {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select></Field>
        <Field label="Period from"><input type="date" value={filters.from} max={filters.to || undefined} onChange={event => onChange({ from: event.target.value })} /></Field>
        <Field label="Period until"><input type="date" value={filters.to} min={filters.from || undefined} onChange={event => onChange({ to: event.target.value })} /></Field>
        <Button disabled={!filtered} onClick={onReset}>{t('Reset filters')}</Button>
    </div>;
});

const LedgerTiles = memo(({ summary }: { summary: LedgerSummary }) => {
    const text = useLedgerText(summary.currency);
    return <div className={chartStyles.tiles}>
        <Tile label="Ticket income">{text.rounded(summary.income)}</Tile>
        <Tile label="Refunded">{text.rounded(summary.refunds)}</Tile>
        <Tile label="Costs recorded">{text.rounded(summary.expenses)}</Tile>
        <Tile label="Of them not paid yet">{text.rounded(summary.planned)}</Tile>
        <Tile label="Result">{text.rounded(summary.result)}</Tile>
    </div>;
});

const COLUMNS = 8;
const canRefund = (entry: LedgerEntry) => entry.kind === 'PAYMENT' && REFUNDABLE.includes(entry.status) && Number(entry.paidAmount ?? entry.amount) > 0;
// The id of an operation names its kind first: "PAYMENT:<id of the payment>".
const paymentIdOf = (entry: LedgerEntry): string => entry.id.slice('PAYMENT:'.length);

const NamedLink = memo(({ to, named }: { to: string; named: { id: string; name: string } | null }) => (
    named ? <Link className={table.name} to={`${to}/${named.id}`}>{named.name}</Link> : <span className={table.secondary}>—</span>
));

// What the operation is about, and — when the buyer paid more than the tickets cost — how much
// they paid: the fees of the shop and of the payment method come on top of the income.
const EntryDescription = memo(({ entry }: { entry: LedgerEntry }) => {
    const { t } = useTranslation();
    const text = useLedgerText(entry.currency);
    const paid = entry.paidAmount && entry.paidAmount !== entry.amount ? ` · ${t('paid {{amount}}', { amount: text.money(entry.paidAmount) })}` : '';
    return <>{entry.description || '—'}{paid}</>;
});

const EntryAmount = memo(({ entry }: { entry: LedgerEntry }) => {
    const { t } = useTranslation();
    const text = useLedgerText(entry.currency);
    const signed = text.signed(entry.amount, entry.direction);
    if (!entry.counted) return <span className={own.uncounted} title={t('Not counted in the totals')}>{signed}</span>;
    return <span className={own[entry.direction === 'IN' ? 'amountIn' : 'amountOut']}>{signed}</span>;
});

const EntryRow = memo(({ entry, onRefunded }: { entry: LedgerEntry; onRefunded: () => void }) => {
    const { t } = useTranslation();
    const [refunding, setRefunding] = useState(false);
    const text = useLedgerText(entry.currency);
    const done = () => { setRefunding(false); onRefunded(); };
    return <><tr>
        <td className={table.secondary}><time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString()}</time></td>
        <td><span className={cls.badge}>{text.category(entry.category)}</span></td>
        <td><NamedLink to="/people" named={entry.person} /></td>
        <td className={table.optional}><NamedLink to="/events" named={entry.event} /></td>
        <td className={`${table.secondary} ${table.optional}`}><EntryDescription entry={entry} /></td>
        <td><StatusBadge status={entry.status} /></td>
        <td className={table.number}><EntryAmount entry={entry} /></td>
        <td>{canRefund(entry) && <Button aria-expanded={refunding} onClick={() => setRefunding(!refunding)}>{t('Refund')}</Button>}</td>
    </tr>
        {refunding && <tr><td colSpan={COLUMNS}><RefundRequestForm paymentId={paymentIdOf(entry)} amount={entry.paidAmount ?? entry.amount} onDone={done} /></td></tr>}</>;
});

const EntriesTable = memo(({ entries, onRefunded }: { entries: LedgerEntry[]; onRefunded: () => void }) => {
    const { t } = useTranslation();
    return <div className={table.tableScroll}><table className={table.table}>
        <thead><tr>
            <th>{t('Date')}</th><th>{t('Category')}</th><th>{t('Person')}</th><th className={table.optional}>{t('Event')}</th>
            <th className={table.optional}>{t('Description')}</th><th>{t('Status')}</th><th className={table.number}>{t('Amount')}</th><th aria-label={t('Actions')} />
        </tr></thead>
        <tbody>{entries.map(entry => <EntryRow key={entry.id} entry={entry} onRefunded={onRefunded} />)}</tbody>
    </table></div>;
});

interface CategoriesProps { totals: LedgerCategoryTotal[]; currency: string; onOpen: (category: string) => void }

// The same operations added up by category; a category opens its operations.
const CategoriesTable = memo(({ totals, currency, onOpen }: CategoriesProps) => {
    const { t } = useTranslation();
    const text = useLedgerText(currency);
    const largest = Math.max(0, ...totals.map(total => Number(total.amount)));
    return <div className={table.tableScroll}><table className={table.table}>
        <thead><tr><th>{t('Category')}</th><th aria-label={t('Share')} /><th className={table.number}>{t('Operations')}</th><th className={table.number}>{t('Amount')}</th></tr></thead>
        <tbody>{totals.map(total => <tr key={total.category}>
            <td><button type="button" className={own.categoryLink} onClick={() => onOpen(total.category)}>{text.category(total.category)}</button></td>
            <td className={own.barCell}><Bar value={Number(total.amount)} largest={largest} title={`${text.category(total.category)}: ${text.money(total.amount)}`} /></td>
            <td className={`${table.number} ${table.secondary}`}>{total.operations}</td>
            <td className={`${table.number} ${own[total.direction === 'IN' ? 'amountIn' : 'amountOut']}`}>{text.signed(total.amount, total.direction)}</td>
        </tr>)}</tbody>
    </table></div>;
});

const VIEWS: Array<[LedgerView, string]> = [['dates', 'By date'], ['categories', 'By category']];

const ViewSwitch = memo(({ view, onChange }: { view: LedgerView; onChange: (view: LedgerView) => void }) => {
    const { t } = useTranslation();
    return <div className={own.views} role="group" aria-label={t('Show')}>
        {VIEWS.map(([name, label]) => <Button key={name} className={view === name ? own.viewActive : undefined} aria-pressed={view === name} onClick={() => onChange(name)}>{t(label)}</Button>)}
    </div>;
});

type Ledger = ReturnType<typeof useLedger>;

const LedgerBody = memo(({ ledger, onRefunded }: { ledger: Ledger; onRefunded: () => void }) => {
    const { t } = useTranslation();
    const list = ledger.list.data;
    const summary = ledger.summary.data;
    const empty = <p className={cls.muted}>{t(ledger.filtered ? 'No operations match the filters' : 'No operations yet')}</p>;
    if (ledger.view === 'categories') return <>{summary && (summary.byCategory.length ? <CategoriesTable totals={summary.byCategory} currency={summary.currency} onOpen={ledger.openCategory} /> : empty)}</>;
    return <>
        {list && list.total > 0 && <EntriesTable entries={list.data} onRefunded={onRefunded} />}
        {list?.total === 0 && empty}
        {list && <Pager page={ledger.page} total={list.total} onChange={ledger.setPage} />}
    </>;
});

// Payments, refunds and costs in one list, with what they add up to under the chosen filters.
export const FinanceLedger = memo(({ onRefundRequested }: { onRefundRequested?: () => void }) => {
    const { t } = useTranslation();
    const ledger = useLedger();
    const events = useResource(listEvents);
    const summary = ledger.summary.data;
    const refunded = useCallback(() => { void ledger.list.refresh(); void ledger.summary.refresh(); onRefundRequested?.(); }, [ledger.list, ledger.summary, onRefundRequested]);
    const loading = (ledger.list.loading && !ledger.list.data) || (ledger.summary.loading && !summary);
    return <>
        <LedgerFiltersBar filters={ledger.filters} events={events.data?.data ?? []} filtered={ledger.filtered} onChange={ledger.change} onReset={ledger.reset} />
        {summary && <LedgerTiles summary={summary} />}
        <section className={cls.panel} aria-label={t('Operations')}>
            <div className={table.summary}>
                <h2>{t('Operations')}</h2>
                <ViewSwitch view={ledger.view} onChange={ledger.setView} />
                {summary && <span className={cls.muted}>{t('Operations found: {{count}}', { count: summary.operations })}</span>}
            </div>
            <RequestState error={ledger.list.error || ledger.summary.error || events.error} loading={loading} />
            <LedgerBody ledger={ledger} onRefunded={refunded} />
            <p className={cls.muted}>{t('Income is the price of the tickets that are still valid, as on the dashboard: without the fees of the ticket shop and of the payment method, and without tickets that were refunded, cancelled or transferred. Failed payments, payments of refunded orders, refunds that are not completed and cancelled expenses are listed but not counted.')}</p>
        </section>
    </>;
});
