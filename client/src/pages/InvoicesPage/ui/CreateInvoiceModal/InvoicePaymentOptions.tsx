import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './CreateInvoiceModal.module.scss';

interface InvoicePaymentOptionsProps {
    paidMode: boolean;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
    onPaymentButtonChange: (checked: boolean) => void;
    onPaymentQrChange: (checked: boolean) => void;
}

export const InvoicePaymentOptions = memo((props: InvoicePaymentOptionsProps) => {
    const { t } = useTranslation();
    const { paidMode, showPaymentButton, showPaymentQr, onPaymentButtonChange, onPaymentQrChange } = props;

    if (paidMode) {
        return (
            <div className={s.paidOptions}>
                <strong>{t('Сначала будет создан черновик')}</strong>
                <small>{t('Проверьте данные и PDF. После проверки нажмите «Подтвердить как оплаченный» в списке инвойсов и укажите данные оплаты.')}</small>
            </div>
        );
    }

    return (
        <div className={s.paymentOptions}>
            <strong>{t('Оплата Mollie в инвойсе')}</strong>
            <label>
                <input type="checkbox" checked={showPaymentButton} onChange={(event) => onPaymentButtonChange(event.target.checked)} />
                {t('Показывать кнопку «Оплатить»')}
            </label>
            <label>
                <input type="checkbox" checked={showPaymentQr} onChange={(event) => onPaymentQrChange(event.target.checked)} />
                {t('Показывать QR-код оплаты')}
            </label>
        </div>
    );
});
