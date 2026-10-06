import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text/Text';
import type { ClientPaymentSummary } from './types';
import s from './ClientPaymentBlock.module.scss';

interface ClientPaymentHeaderProps {
    statusText: string;
    paymentStatus: ClientPaymentSummary['summary']['paymentStatus'];
    onOpenPaymentLink: () => void;
    onOpenMandate: () => void;
    onOpenSubscription: () => void;
}

const statusClassMap = {
    issue: s.issue,
    active: s.active,
    unknown: s.active,
} as const;

export const ClientPaymentHeader = memo((props: ClientPaymentHeaderProps) => {
    const { t } = useTranslation();
    const {
        statusText,
        paymentStatus,
        onOpenPaymentLink,
        onOpenMandate,
        onOpenSubscription,
    } = props;

    return (
        <div className={s.header}>
            <div>
                <Text title="Платежи ученика" size="m" bold />
                <Text
                    text="Плательщики, подписки и последние списания по связанным Mollie профилям."
                    size="s"
                    className={s.subtitle}
                />
            </div>
            <div className={s.headerActions}>
                <span className={`${s.status} ${statusClassMap[paymentStatus]}`}>
                    {statusText}
                </span>
                <Button
                    theme={ButtonTheme.BACKGROUND_INVERTED}
                    onClick={onOpenPaymentLink}
                >
                    {t('Payment link')}
                </Button>
                <Button theme={ButtonTheme.OUTLINE} onClick={onOpenMandate}>
                    {t('Создать mandate')}
                </Button>
                <Button theme={ButtonTheme.OUTLINE} onClick={onOpenSubscription}>
                    {t('Создать подписку')}
                </Button>
            </div>
        </div>
    );
});
