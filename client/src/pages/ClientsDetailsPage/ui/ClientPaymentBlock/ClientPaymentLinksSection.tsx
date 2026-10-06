import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text/Text';
import type { ClientPayment } from './types';
import { formatAmount, formatDate, getPayerName } from './helpers';
import s from './ClientPaymentBlock.module.scss';

interface ClientPaymentLinksSectionProps {
    paymentLinks?: ClientPayment[];
    onCopy: (checkoutUrl?: string) => void;
    onCancel: (payment: ClientPayment) => void;
}

export const ClientPaymentLinksSection = memo((props: ClientPaymentLinksSectionProps) => {
    const { t } = useTranslation();
    const { paymentLinks, onCopy, onCancel } = props;

    return (
        <div className={s.section}>
            <Text title="Payment links" size="s" bold />
            {paymentLinks?.length ? paymentLinks.map((payment) => (
                <div className={s.paymentLinkRow} key={payment.id}>
                    <div className={s.rowMain}>
                        <span className={s.primaryText}>{payment.description || payment.mollieId || `Payment #${payment.id}`}</span>
                        <span>
                            {getPayerName(payment.customer)} · {formatAmount(payment.amountValue, payment.amountCurrency)} · {payment.status} · {formatDate(payment.createdAt)}
                        </span>
                    </div>
                    <div className={s.paymentLinkActions}>
                        {payment.checkoutUrl && payment.status === 'open' && (
                            <>
                                <Button
                                    theme={ButtonTheme.OUTLINE}
                                    onClick={() => onCopy(payment.checkoutUrl)}
                                >
                                    {t('Копировать')}
                                </Button>
                                <Button
                                    theme={ButtonTheme.OUTLINE}
                                    onClick={() => window.open(payment.checkoutUrl, '_blank', 'noopener,noreferrer')}
                                >
                                    {t('Открыть')}
                                </Button>
                            </>
                        )}
                        {payment.isCancelable && (
                            <Button
                                theme={ButtonTheme.OUTLINE_RED}
                                onClick={() => onCancel(payment)}
                            >
                                {t('Отменить')}
                            </Button>
                        )}
                    </div>
                </div>
            )) : (
                <Text text="Payment links пока не создавались." size="s" />
            )}
        </div>
    );
});
