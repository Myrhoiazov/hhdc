import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text/Text';
import type { ClientMandate } from './types';
import { formatDate, getPayerName } from './helpers';
import s from './ClientPaymentBlock.module.scss';

interface ClientMandatesSectionProps {
    mandates?: ClientMandate[];
    onRevoke: (mandate: ClientMandate) => void;
}

export const ClientMandatesSection = memo((props: ClientMandatesSectionProps) => {
    const { t } = useTranslation();
    const { mandates, onRevoke } = props;

    return (
        <div className={s.section}>
            <Text title="Mandates" text="Отозванные mandates остаются в истории и не могут быть восстановлены." size="s" bold />
            {mandates?.length ? mandates.map((mandate) => (
                <div className={s.row} key={mandate.id}>
                    <div className={s.rowMain}>
                        <span className={s.primaryText}>{mandate.mollieId || `Mandate #${mandate.id}`}</span>
                        <span>{getPayerName(mandate.customer)} · {mandate.method} · {mandate.status}</span>
                        <span>{t('Подписан: {{signatureDate}} · создан: {{createdAt}} · изменён: {{updatedAt}}', { signatureDate: formatDate(mandate.signatureDate), createdAt: formatDate(mandate.createdAt), updatedAt: formatDate(mandate.updatedAt) })}</span>
                    </div>
                    {mandate.status === 'valid' && (
                        <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onRevoke(mandate)}>{t('Отозвать')}</Button>
                    )}
                </div>
            )) : (
                <Text text="Mandates не найдены." size="s" />
            )}
        </div>
    );
});
