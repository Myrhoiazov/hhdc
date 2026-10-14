import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FinanceAssignment, getChoreographerFinance, PayoutRights } from '@/entities/Choreographer';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { PersonExpenses } from '@/widgets/PersonExpenses';
import own from '../Choreographers.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';
import { TotalsTable } from './FinanceTotals';
import { Agreements, Expenses, Payments } from './FinanceRecords';
import { FeeForm } from './FinanceForms';
import { ExpenseForm } from './ExpenseForm';
import { PaymentForm } from './PaymentForm';

const AssignmentLedger = memo(
    ({
        assignment,
        rights,
        run,
    }: {
        assignment: FinanceAssignment;
        rights: PayoutRights;
        run: Run;
    }) => {
        const { t } = useTranslation();
        return (
            <article className={own.assignment} aria-label={assignment.event.name}>
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
            </article>
        );
    }
);

export const FinanceTab = memo(
    ({ personId, rights }: { personId: string; rights: PayoutRights }) => {
        const { t } = useTranslation();
        const load = useCallback(() => getChoreographerFinance(personId), [personId]);
        const finance = useResource(load);
        const [error, setError] = useState('');
        // Financial changes are shown only after the server confirmed them: the ledger is reloaded.
        const run: Run = async (work) => {
            setError('');
            try {
                await work();
                await finance.refresh();
                return true;
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
                return false;
            }
        };
        return (
            <>
                <RequestState
                    error={error || finance.error}
                    loading={finance.loading && !finance.data}
                />
                {finance.data?.years.map(({ year, totals }) => (
                    <Panel key={year} aria-label={`${t('Finance')} ${year}`}>
                        <h2>{year}</h2>
                        <TotalsTable totals={totals} />
                        {finance.data?.assignments
                            .filter((item) => item.year === year)
                            .map((item) => (
                                <AssignmentLedger
                                    key={item.id}
                                    assignment={item}
                                    rights={rights}
                                    run={run}
                                />
                            ))}
                    </Panel>
                ))}
                {finance.data?.assignments.length === 0 && (
                    <Panel>
                        <p className={cls.muted}>
                            {t(
                                'Finance is recorded per event. Add the choreographer to an event first.'
                            )}
                        </p>
                    </Panel>
                )}
                <PersonExpenses personId={personId} />
            </>
        );
    }
);
