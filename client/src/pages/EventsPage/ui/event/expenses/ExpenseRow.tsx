import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ExpenseLine,
    ExpenseStatus,
    useExpenseText,
    nextExpenseActions,
} from '@/entities/EventExpense';
import { formatDate } from '@/shared/lib/format/date';
import { Button } from '@/shared/ui/Button';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Badge } from '@/shared/ui/Badge';
import { listStyles as own } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import form from './EventExpenses.module.scss';

export interface RowActions {
    canEdit: boolean;
    busy: boolean;
    onStatus: (line: ExpenseLine, status: ExpenseStatus) => void;
    onEdit: (line: ExpenseLine) => void;
    onDelete: (line: ExpenseLine) => Promise<void>;
}

const RowButtons = memo(
    ({ line, busy, onStatus, onEdit, onDelete }: RowActions & { line: ExpenseLine }) => {
        const { t } = useTranslation();
        const text = useExpenseText(line.currency);
        return (
            <span className={cls.actions}>
                {nextExpenseActions(line.status).map(([status, label]) => (
                    <Button key={status} disabled={busy} onClick={() => onStatus(line, status)}>
                        {t(label)}
                    </Button>
                ))}
                <Button disabled={busy} onClick={() => onEdit(line)}>
                    {t('Edit')}
                </Button>
                <ConfirmDelete
                    label={t('Delete expense {{amount}}', { amount: text.money(line.amount) })}
                    onDelete={() => onDelete(line)}
                />
            </span>
        );
    }
);

export const ExpenseRow = memo(({ line, ...actions }: RowActions & { line: ExpenseLine }) => {
    const { t } = useTranslation();
    const text = useExpenseText(line.currency);
    const own_ = line.source === 'EVENT';
    return (
        <tr>
            <td className={`${own.secondary} ${own.whole}`}>
                {line.date ? formatDate(line.date) : '—'}
            </td>
            <td>{text.category(line.category)}</td>
            <td>
                {line.person ? (
                    <Link className={own.name} to={`/people/${line.person.id}`}>
                        {line.person.displayName}
                    </Link>
                ) : (
                    '—'
                )}
                {line.teamMember && <span className={form.role}>{line.teamMember.roleTitle}</span>}
            </td>
            <td className={`${own.secondary} ${own.optional}`}>
                {line.description || (own_ ? '—' : t("From the choreographer's card"))}
            </td>
            <td className={own.number}>{text.money(line.amount)}</td>
            <td>
                <Badge>{text.status(line.status)}</Badge>
            </td>
            <td>
                {own_ && actions.canEdit ? (
                    <RowButtons line={line} {...actions} />
                ) : (
                    !own_ && (
                        <span className={own.secondary}>{t("From the choreographer's card")}</span>
                    )
                )}
            </td>
        </tr>
    );
});
