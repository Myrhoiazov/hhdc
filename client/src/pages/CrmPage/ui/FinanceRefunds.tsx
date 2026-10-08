import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { actOnRefund, Refund, requestRefund } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from './common';
import cls from './CrmPage.module.scss';

export const REFUNDABLE = ['PAID', 'PARTIALLY_REFUNDED'];
type RefundAction = 'approve' | 'reject' | 'process' | 'sync';
const REFUND_ACTIONS: Record<string, RefundAction[]> = { REQUESTED: ['approve', 'reject'], APPROVED: ['process', 'reject'], PROCESSING: ['sync'], FAILED: ['process'] };

interface RequestProps { paymentId: string; amount: string; onDone: () => void }

export const RefundRequestForm = memo(({ paymentId, amount, onDone }: RequestProps) => {
    const { t } = useTranslation();
    const action = useAction(onDone);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void action.run(() => requestRefund({ paymentId, amount: String(form.get('amount')), reason: String(form.get('reason')) }));
    };
    return <form className={cls.grid} onSubmit={submit} aria-label={t('Request refund')}>
        <Field label="Refund amount"><input name="amount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={amount} required /></Field>
        <Field label="Reason"><input name="reason" minLength={3} required /></Field>
        <RequestState error={action.error} loading={false} />
        <Button type="submit" disabled={action.busy}>{t('Request refund')}</Button>
    </form>;
});

const RefundRow = memo(({ refund, refresh }: { refund: Refund; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const act = (name: RefundAction) => {
        if (name === 'process' && !window.confirm(t('Send this refund to the payment provider?'))) return;
        void action.run(() => actOnRefund(refund.id, name));
    };
    return <div>
        <div className={cls.row}>
            <span>{refund.person?.displayName || t('Unknown person')}</span>
            <strong>{refund.amount} {refund.currency}</strong>
            <span>{refund.reason}</span>
            <StatusBadge status={refund.status} />
            <div className={cls.actions}>{(REFUND_ACTIONS[refund.status] || []).map(name => <Button key={name} disabled={action.busy} onClick={() => act(name)}>{t(name)}</Button>)}</div>
        </div>
        <RequestState error={action.error || refund.error || ''} loading={false} />
    </div>;
});

// Refund requests and what staff may do with each. Hidden while nobody asked for a refund.
export const RefundsPanel = memo(({ refunds, refresh }: { refunds: Refund[]; refresh: () => void }) => {
    const { t } = useTranslation();
    if (!refunds.length) return null;
    return <section className={cls.panel} aria-label={t('Refunds')}>
        <h2>{t('Refunds')}</h2>
        {refunds.map(item => <RefundRow key={item.id} refund={item} refresh={refresh} />)}
    </section>;
});
