import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    createEventExpense,
    EVENT_EXPENSE_CATEGORIES,
    useExpenseText,
} from '@/entities/EventExpense';
import { TeamMember } from '@/entities/EventTeam';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import form from './EventExpenses.module.scss';
import { PayeeFields } from './PayeeFields';
import { readExpense } from '../../../model/expenseForm';

export const AddExpense = memo(
    ({ eventId, team, onSaved }: { eventId: string; team: TeamMember[]; onSaved: () => void }) => {
        const { t } = useTranslation();
        const text = useExpenseText();
        const [error, setError] = useState('');
        // A saved expense empties the form, the payee search included.
        const [formKey, setFormKey] = useState(0);
        const action = useAction(onSaved);
        const submit = async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const element = event.currentTarget;
            const input = readExpense(new FormData(element));
            if (!input.category || !(Number(input.amount) > 0)) {
                setError(t('Enter a category and an amount greater than zero'));
                return;
            }
            setError('');
            if (await action.run(() => createEventExpense(eventId, input))) {
                element.reset();
                setFormKey((key) => key + 1);
            }
        };
        return (
            <form
                className={form.form}
                onSubmit={(event) => void submit(event)}
                aria-label={t('Add an expense')}
            >
                <div className={form.intro}>
                    <h3>{t('Add an expense')}</h3>
                    <p className={cls.muted}>
                        {t(
                            "A fee, a salary, the venue, travel — anything the event costs. Choose who it is paid to — somebody from the team, a choreographer or a partner — and the amount appears on that person's page."
                        )}
                    </p>
                </div>
                <div className={form.fields}>
                    <Field label="Category">
                        <select name="category" defaultValue="FEE">
                            {EVENT_EXPENSE_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                    {text.category(category)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Amount">
                        <input name="amount" inputMode="decimal" autoComplete="off" required />
                    </Field>
                    <Field label="Date">
                        <input name="expenseDate" type="date" />
                    </Field>
                    <PayeeFields key={formKey} team={team} />
                    <div className={form.wide}>
                        <Field label="Description">
                            <input name="description" maxLength={500} />
                        </Field>
                    </div>
                    <label className={form.paid}>
                        <input type="checkbox" name="paid" />
                        {t('Already paid')}
                    </label>
                </div>
                {(error || action.error) && (
                    <p role="alert" className={cls.error}>
                        {error || action.error}
                    </p>
                )}
                <div className={cls.actions}>
                    <Button type="submit" disabled={action.busy}>
                        {t('Save expense')}
                    </Button>
                </div>
            </form>
        );
    }
);
