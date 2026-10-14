import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    EXPENSE_CATEGORIES,
    EXPENSE_PAYERS,
    recordChoreographerExpense,
} from '@/entities/Choreographer';
import { formText } from '@/shared/lib/form/formText';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';

export const ExpenseForm = memo(({ assignmentId, run }: { assignmentId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        void run(() =>
            recordChoreographerExpense(assignmentId, {
                category: formText(form, 'category'),
                currency: formText(form, 'currency'),
                estimatedAmount: formText(form, 'estimatedAmount') || null,
                actualAmount: formText(form, 'actualAmount') || null,
                paidBy: formText(form, 'paidBy'),
                reimbursable: form.get('reimbursable') === 'on',
                description: formText(form, 'description'),
            })
        ).then((saved) => {
            if (saved) element.reset();
        });
    };
    return (
        <form className={cls.grid} onSubmit={submit} aria-label={t('Record expense')}>
            <Field label="Expense type">
                <select name="category" defaultValue="TRAVEL">
                    {EXPENSE_CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                            {t(`EXPENSE_${item}`)}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Planned amount">
                <input name="estimatedAmount" inputMode="decimal" />
            </Field>
            <Field label="Actual amount">
                <input name="actualAmount" inputMode="decimal" />
            </Field>
            <Field label="Currency">
                <input name="currency" required maxLength={3} defaultValue="EUR" />
            </Field>
            <Field label="Paid by">
                <select name="paidBy" defaultValue="ORGANIZER">
                    {EXPENSE_PAYERS.map((item) => (
                        <option key={item} value={item}>
                            {t(`PAYER_${item}`)}
                        </option>
                    ))}
                </select>
            </Field>
            <label className={cls.check}>
                <input name="reimbursable" type="checkbox" />
                {t('Reimbursed to the choreographer')}
            </label>
            <div className={cls.wide}>
                <Field label="Description">
                    <input name="description" maxLength={500} />
                </Field>
            </div>
            <div className={cls.wide}>
                <Button type="submit">{t('Record expense')}</Button>
            </div>
        </form>
    );
});
