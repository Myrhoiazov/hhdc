import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { actOnRefund, Refund, nextRefundActions, RefundAction } from '@/entities/Finance';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const RefundRow = memo(({ refund, refresh }: { refund: Refund; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const act = (name: RefundAction) => {
        if (name === 'process' && !window.confirm(t('Send this refund to the payment provider?')))
            return;
        void action.run(() => actOnRefund(refund.id, name));
    };
    return (
        <div>
            <div className={cls.row}>
                <span>{refund.person?.displayName || t('Unknown person')}</span>
                <strong>
                    {refund.amount} {refund.currency}
                </strong>
                <span>{refund.reason}</span>
                <StatusBadge status={refund.status} />
                <div className={cls.actions}>
                    {nextRefundActions(refund.status).map((name) => (
                        <Button key={name} disabled={action.busy} onClick={() => act(name)}>
                            {t(name)}
                        </Button>
                    ))}
                </div>
            </div>
            <RequestState error={action.error || refund.error || ''} loading={false} />
        </div>
    );
});

// Refund requests and what staff may do with each. Hidden while nobody asked for a refund.
export const RefundsPanel = memo(
    ({ refunds, refresh }: { refunds: Refund[]; refresh: () => void }) => {
        const { t } = useTranslation();
        if (!refunds.length) return null;
        return (
            <Panel aria-label={t('Refunds')}>
                <h2>{t('Refunds')}</h2>
                {refunds.map((item) => (
                    <RefundRow key={item.id} refund={item} refresh={refresh} />
                ))}
            </Panel>
        );
    }
);
