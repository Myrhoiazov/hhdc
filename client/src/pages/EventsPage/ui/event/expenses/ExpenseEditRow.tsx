import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EVENT_EXPENSE_CATEGORIES, ExpenseLine, useExpenseText } from '@/entities/EventExpense';
import { TeamMember } from '@/entities/EventTeam';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import form from './EventExpenses.module.scss';
import { PayeeFields } from './PayeeFields';
import { ExpenseEdit, readExpenseEdit } from '../../../model/expenseForm';

const COLUMNS = 7;

export interface EditProps {
    line: ExpenseLine;
    team: TeamMember[];
    busy: boolean;
    onSave: (line: ExpenseLine, change: ExpenseEdit) => void;
    onCancel: () => void;
}

// The row of an expense being corrected: category, amount, date, who it is paid to and the
// description. Whether it is paid is changed with the buttons of the row.
export const ExpenseEditRow = memo(({ line, team, busy, onSave, onCancel }: EditProps) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const change = readExpenseEdit(new FormData(event.currentTarget));
        if (!(Number(change.amount) > 0)) {
            setError(t('Enter a category and an amount greater than zero'));
            return;
        }
        onSave(line, change);
    };
    return (
        <tr>
            <td colSpan={COLUMNS}>
                <form className={form.fields} onSubmit={submit} aria-label={t('Edit expense')}>
                    <Field label="Category">
                        <select name="category" defaultValue={line.category}>
                            {EVENT_EXPENSE_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                    {text.category(category)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Amount">
                        <input
                            name="amount"
                            inputMode="decimal"
                            autoComplete="off"
                            defaultValue={line.amount}
                            required
                        />
                    </Field>
                    <Field label="Date">
                        <input name="expenseDate" type="date" defaultValue={line.date ?? ''} />
                    </Field>
                    <PayeeFields team={team} current={line} />
                    <div className={form.wide}>
                        <Field label="Description">
                            <input
                                name="description"
                                maxLength={500}
                                defaultValue={line.description ?? ''}
                            />
                        </Field>
                    </div>
                    {error && (
                        <p role="alert" className={cls.error}>
                            {error}
                        </p>
                    )}
                    <div className={cls.actions}>
                        <Button type="submit" disabled={busy}>
                            {t('Save')}
                        </Button>
                        <Button disabled={busy} onClick={onCancel}>
                            {t('Cancel')}
                        </Button>
                    </div>
                </form>
            </td>
        </tr>
    );
});
