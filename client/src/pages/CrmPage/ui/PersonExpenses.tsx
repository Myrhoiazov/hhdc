import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPersonExpenses } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from './common';
import { ExpenseTotals, useExpenseText } from './EventExpenses';
import { listStyles as own } from './ListTable';
import cls from './CrmPage.module.scss';

// What events planned for and paid to this person. The lines are entered on the event page;
// here they are only read, so the person's page and the event never disagree.
export const PersonExpenses = memo(({ personId }: { personId: string }) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    const load = useCallback(() => listPersonExpenses(personId), [personId]);
    const expenses = useResource(load);
    const { data } = expenses;
    return <section className={cls.panel} aria-label={t('Payments and expenses from events')}>
        <h2>{t('Payments and expenses from events')}</h2>
        <RequestState error={expenses.error} loading={expenses.loading && !data} />
        {data?.lines.length === 0 && <p className={cls.muted}>{t('Nothing has been planned for or paid to this person on events yet')}</p>}
        {data && data.lines.length > 0 && <>
            <ExpenseTotals totals={data.totals} />
            <div className={own.tableScroll}><table className={own.table}>
                <thead><tr><th>{t('Date')}</th><th>{t('Event')}</th><th>{t('Category')}</th><th className={own.optional}>{t('Description')}</th><th className={own.number}>{t('Amount')}</th><th>{t('Status')}</th></tr></thead>
                <tbody>{data.lines.map(line => <tr key={line.id}>
                    <td className={own.secondary}>{line.date ? new Date(line.date).toLocaleDateString() : '—'}</td>
                    <td>{line.event ? <Link className={own.name} to={`/events/${line.event.id}`}>{line.event.name}</Link> : '—'}</td>
                    <td>{text.category(line.category)}</td>
                    <td className={`${own.secondary} ${own.optional}`}>{line.description || '—'}</td>
                    <td className={own.number}>{text.money(line.amount)}</td>
                    <td><span className={cls.badge}>{text.status(line.status)}</span></td>
                </tr>)}</tbody>
            </table></div>
        </>}
    </section>;
});
