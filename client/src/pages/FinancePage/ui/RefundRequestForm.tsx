import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { requestRefund } from '@/entities/Finance';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import cls from '@/shared/ui/layout/layout.module.scss';

interface RequestProps {
    paymentId: string;
    amount: string;
    onDone: () => void;
}

export const RefundRequestForm = memo(({ paymentId, amount, onDone }: RequestProps) => {
    const { t } = useTranslation();
    const action = useAction(onDone);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void action.run(() =>
            requestRefund({
                paymentId,
                amount: String(form.get('amount')),
                reason: String(form.get('reason')),
            })
        );
    };
    return (
        <form className={cls.grid} onSubmit={submit} aria-label={t('Request refund')}>
            <Field label="Refund amount">
                <input
                    name="amount"
                    inputMode="decimal"
                    pattern="\d+(\.\d{1,2})?"
                    defaultValue={amount}
                    required
                />
            </Field>
            <Field label="Reason">
                <input name="reason" minLength={3} required />
            </Field>
            <RequestState error={action.error} loading={false} />
            <Button type="submit" disabled={action.busy}>
                {t('Request refund')}
            </Button>
        </form>
    );
});
