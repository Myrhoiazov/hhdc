import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TeamMember } from '@/entities/EventTeam';
import { formText } from '@/shared/lib/form/formText';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './EventTeam.module.scss';
import { money } from '../../../model/teamForm';
import { FormRowProps } from './EditRow';
import { TeamPayment } from '../../../model/teamTypes';

// A payment for the role: one more line among the expenses of the event, a salary paid to this person.
export const PayRow = memo(
    ({
        member,
        columns,
        busy,
        onCancel,
        onPay,
    }: FormRowProps & { onPay: (member: TeamMember, payment: TeamPayment) => void }) => {
        const { t } = useTranslation();
        const [error, setError] = useState('');
        const title = t('Add a payment to {{name}}', {
            name: `${member.person.displayName} — ${member.roleTitle}`,
        });
        const submit = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const amount = money(form);
            if (!(Number(amount) > 0)) {
                setError(t('Enter an amount greater than zero'));
                return;
            }
            onPay(member, {
                amount,
                expenseDate: formText(form, 'expenseDate') || null,
                paid: Boolean(form.get('paid')),
            });
        };
        return (
            <tr>
                <td colSpan={columns}>
                    <form className={own.fields} onSubmit={submit} aria-label={title}>
                        <strong className={own.whole}>{title}</strong>
                        <Field label="Amount">
                            <input name="amount" inputMode="decimal" autoComplete="off" required />
                        </Field>
                        <Field label="Date">
                            <input name="expenseDate" type="date" />
                        </Field>
                        <label className={own.check}>
                            <input type="checkbox" name="paid" />
                            {t('Already paid')}
                        </label>
                        {error && (
                            <p role="alert" className={`${cls.error} ${own.whole}`}>
                                {error}
                            </p>
                        )}
                        <div className={`${cls.actions} ${own.whole}`}>
                            <Button type="submit" disabled={busy}>
                                {t('Save payment')}
                            </Button>
                            <Button disabled={busy} onClick={onCancel}>
                                {t('Cancel')}
                            </Button>
                        </div>
                    </form>
                </td>
            </tr>
        );
    }
);
