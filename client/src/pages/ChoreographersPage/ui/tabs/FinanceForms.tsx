import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FEE_STATUSES, recordFeeAgreement } from '@/entities/Choreographer';
import { formText } from '@/shared/lib/form/formText';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import cls from '@/shared/ui/layout/layout.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';

export const AmountFields = memo(({ amountLabel = 'Amount' }: { amountLabel?: string }) => (
    <>
        <Field label={amountLabel}>
            <input name="amount" inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" />
        </Field>
        <Field label="Currency">
            <input name="currency" required maxLength={3} defaultValue="EUR" />
        </Field>
    </>
));

export const FeeForm = memo(({ assignmentId, run }: { assignmentId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        void run(() =>
            recordFeeAgreement(assignmentId, {
                status: formText(form, 'status'),
                amount: formText(form, 'amount'),
                currency: formText(form, 'currency'),
                notes: formText(form, 'notes'),
            })
        ).then((saved) => {
            if (saved) element.reset();
        });
    };
    return (
        <form className={cls.grid} onSubmit={submit} aria-label={t('Record fee')}>
            <Field label="Negotiation step">
                <select name="status" defaultValue="PROPOSED">
                    {FEE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {t(status)}
                        </option>
                    ))}
                </select>
            </Field>
            <AmountFields />
            <Field label="Note">
                <input name="notes" maxLength={500} />
            </Field>
            <div className={cls.wide}>
                <Button type="submit">{t('Record fee')}</Button>
            </div>
        </form>
    );
});
