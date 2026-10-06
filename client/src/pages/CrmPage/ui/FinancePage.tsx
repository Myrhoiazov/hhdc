import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { actOnRefund, FinanceOverview, getEventFinance, listEvents, listPayments, listRefunds, MoneyLine, Payment, Refund, requestRefund } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from './common';
import cls from './CrmPage.module.scss';

const REFUNDABLE = ['PAID', 'PARTIALLY_REFUNDED'];
type RefundAction = 'approve' | 'reject' | 'process' | 'sync';
const REFUND_ACTIONS: Record<string, RefundAction[]> = { REQUESTED: ['approve', 'reject'], APPROVED: ['process', 'reject'], PROCESSING: ['sync'], FAILED: ['process'] };

const RefundRequestForm = memo(({ payment, refresh }: { payment: Payment; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void action.run(() => requestRefund({ paymentId: payment.id, amount: String(form.get('amount')), reason: String(form.get('reason')) }));
    };
    return <form className={cls.grid} onSubmit={submit}>
        <Field label="Refund amount"><input name="amount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={payment.amount} required /></Field>
        <Field label="Reason"><input name="reason" minLength={3} required /></Field>
        <RequestState error={action.error} loading={false} />
        <Button type="submit" disabled={action.busy}>{t('Request refund')}</Button>
    </form>;
});

const PaymentRow = memo(({ payment, refresh }: { payment: Payment; refresh: () => void }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return <div>
        <div className={cls.row}>
            <span>{payment.person?.displayName || t('Unknown person')}</span>
            <strong>{payment.amount} {payment.currency}</strong>
            <StatusBadge status={payment.status} />
            {REFUNDABLE.includes(payment.status) && <Button onClick={() => setOpen(!open)}>{t('Refund')}</Button>}
        </div>
        {open && <RefundRequestForm payment={payment} refresh={refresh} />}
    </div>;
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

const MoneyRow = memo(({ label, line }: { label: string; line: MoneyLine }) => {
    const { t } = useTranslation();
    return <div className={cls.row}><span>{t(label)}</span><span>{Object.entries(line).map(([kind, amount]) => `${t(kind)}: €${amount}`).join(' · ')}</span></div>;
});

const OverviewTable = memo(({ overview }: { overview: FinanceOverview }) => <div>
    <MoneyRow label="Ticket revenue" line={overview.ticketRevenue} />
    <MoneyRow label="Refunds" line={overview.refunds} />
    <MoneyRow label="Net ticket revenue" line={overview.netTicketRevenue} />
    {Object.entries(overview.costs).map(([type, line]) => <MoneyRow key={type} label={`Cost: ${type}`} line={line} />)}
    <MoneyRow label="Estimated margin" line={overview.estimatedMargin} />
</div>);

const EventOverview = memo(() => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [eventId, setEventId] = useState('');
    const load = useCallback(() => (eventId ? getEventFinance(eventId) : Promise.resolve(undefined)), [eventId]);
    const overview = useResource(load);
    return <section className={cls.panel}>
        <h2>{t('Event financial overview')}</h2>
        <Field label="Event"><select value={eventId} onChange={change => setEventId(change.target.value)}><option value="">{t('Select event')}</option>{events.data?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <RequestState error={overview.error || events.error} loading={overview.loading} />
        {overview.data && <OverviewTable overview={overview.data} />}
    </section>;
});

export const FinancePage = memo(() => {
    const { t } = useTranslation();
    const payments = useResource(listPayments);
    const refunds = useResource(listRefunds);
    const refresh = useCallback(() => { void payments.refresh(); void refunds.refresh(); }, [payments, refunds]);
    return <CrmLayout title="Finance">
        <RequestState error={payments.error || refunds.error} loading={payments.loading || refunds.loading} />
        <EventOverview />
        <section className={cls.panel}>
            <h2>{t('Refunds')}</h2>
            {refunds.data?.total === 0 && <p>{t('No refund requests')}</p>}
            {refunds.data?.data.map(item => <RefundRow key={item.id} refund={item} refresh={refresh} />)}
        </section>
        <section className={cls.panel}>
            <h2>{t('Payments')}</h2>
            {payments.data?.total === 0 && <p>{t('No payments yet')}</p>}
            {payments.data?.data.map(item => <PaymentRow key={item.id} payment={item} refresh={refresh} />)}
        </section>
    </CrmLayout>;
});
