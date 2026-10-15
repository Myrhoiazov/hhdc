import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PAYOUT_TYPES, recordPayout } from '@/entities/Choreographer';
import { formText } from '@/shared/lib/form/formText';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';
import { AmountFields } from './FinanceForms';

export const PaymentForm = memo(({ assignmentId, run }: { assignmentId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        void run(() =>
            recordPayout(assignmentId, {
                type: formText(form, 'type'),
                amount: formText(form, 'amount'),
                currency: formText(form, 'currency'),
                status: 'PLANNED',
                reference: formText(form, 'reference'),
            })
        ).then((saved) => {
            if (saved) element.reset();
        });
    };
    return (
        <form className={cls.grid} onSubmit={submit} aria-label={t('Record payment')}>
            <Field label="Payment type">
                <select name="type" defaultValue="FEE">
                    {PAYOUT_TYPES.map((item) => (
                        <option key={item} value={item}>
                            {t(`PAYOUT_${item}`)}
                        </option>
                    ))}
                </select>
            </Field>
            <AmountFields />
            <Field label="Reference">
                <input name="reference" maxLength={200} />
            </Field>
            <div className={cls.wide}>
                <Button type="submit">{t('Record payment')}</Button>
            </div>
        </form>
    );
});
