import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listEventExpenses, ExpenseTotals } from '@/entities/EventExpense';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ExpensesTable } from './ExpensesTable';
import { AddExpense } from './AddExpense';
import { useExpenseChanges, usePayeeTeam } from '../../../model/useExpenseChanges';

interface EventExpensesProps {
    eventId: string;
    canEdit: boolean;
    version?: number;
    onChanged?: () => void;
}

// `version` changes when the team of the event does: a new member comes with pay, which is an expense.
export const EventExpenses = memo(
    ({ eventId, canEdit, version = 0, onChanged }: EventExpensesProps) => {
        const { t } = useTranslation();
        const load = useCallback(() => listEventExpenses(eventId), [eventId, version]); // eslint-disable-line react-hooks/exhaustive-deps
        const expenses = useResource(load);
        const team = usePayeeTeam(eventId, canEdit, version);
        const refresh = useCallback(() => {
            void expenses.refresh();
            onChanged?.();
        }, [expenses, onChanged]);
        const changes = useExpenseChanges(eventId, refresh);
        const { data } = expenses;
        return (
            <Panel id="event-expenses" aria-label={t('Expenses')}>
                <h2>{t('Expenses')}</h2>
                <RequestState
                    error={expenses.error || changes.error}
                    loading={expenses.loading && !data}
                />
                {data && data.lines.length > 0 && (
                    <>
                        <ExpenseTotals totals={data.totals} />
                        <ExpensesTable
                            lines={data.lines}
                            team={team}
                            canEdit={canEdit}
                            busy={changes.busy}
                            editingId={changes.editingId}
                            onStatus={changes.setStatus}
                            onEdit={changes.edit}
                            onDelete={changes.remove}
                            onSave={changes.save}
                            onCancel={changes.cancel}
                        />
                        {data.lines.some((line) => line.source !== 'EVENT') && (
                            <p className={cls.muted}>
                                {t(
                                    "Expenses and fees kept on a choreographer's card are counted here too and are changed there."
                                )}
                            </p>
                        )}
                    </>
                )}
                {data?.lines.length === 0 && (
                    <p className={cls.muted}>{t('No expenses recorded for this event yet')}</p>
                )}
                {canEdit && <AddExpense eventId={eventId} team={team} onSaved={refresh} />}
            </Panel>
        );
    }
);
