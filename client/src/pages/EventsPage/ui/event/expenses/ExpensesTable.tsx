import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpenseLine } from '@/entities/EventExpense';
import { TeamMember } from '@/entities/EventTeam';
import { listStyles as own } from '@/shared/ui/ListTable';
import { RowActions, ExpenseRow } from './ExpenseRow';
import { EditProps, ExpenseEditRow } from './ExpenseEditRow';

interface TableProps extends RowActions {
    lines: ExpenseLine[];
    team: TeamMember[];
    editingId: string;
    onSave: EditProps['onSave'];
    onCancel: () => void;
}

export const ExpensesTable = memo(
    ({ lines, team, editingId, onSave, onCancel, ...actions }: TableProps) => {
        const { t } = useTranslation();
        return (
            <div className={own.tableScroll}>
                <table className={own.table}>
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Category')}</th>
                            <th>{t('Paid to')}</th>
                            <th className={own.optional}>{t('Description')}</th>
                            <th className={own.number}>{t('Amount')}</th>
                            <th>{t('Status')}</th>
                            <th aria-label={t('Actions')} />
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) =>
                            line.source === 'EVENT' && line.id === editingId ? (
                                <ExpenseEditRow
                                    key={`edit-${line.id}`}
                                    line={line}
                                    team={team}
                                    busy={actions.busy}
                                    onSave={onSave}
                                    onCancel={onCancel}
                                />
                            ) : (
                                <ExpenseRow
                                    key={`${line.source}-${line.id}`}
                                    line={line}
                                    {...actions}
                                />
                            )
                        )}
                    </tbody>
                </table>
            </div>
        );
    }
);
