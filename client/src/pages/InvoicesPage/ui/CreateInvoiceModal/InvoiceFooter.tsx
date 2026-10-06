import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './CreateInvoiceModal.module.scss';

interface InvoiceFooterProps {
    totalCents: number;
    saving: boolean;
    editInvoice: boolean;
    paidMode: boolean;
    onSubmit: () => void;
}

export const InvoiceFooter = memo((props: InvoiceFooterProps) => {
    const { t } = useTranslation();
    const { totalCents, saving, editInvoice, paidMode, onSubmit } = props;

    return (
        <div className={s.footer}>
            <strong>{t('Итого: {{total}} EUR', { total: (totalCents / 100).toFixed(2) })}</strong>
            <button className={s.submit} disabled={saving} onClick={onSubmit}>
                {saving ? 'Сохранение...' : editInvoice ? 'Сохранить изменения' : paidMode ? 'Сохранить черновик' : 'Создать инвойс'}
            </button>
        </div>
    );
});
