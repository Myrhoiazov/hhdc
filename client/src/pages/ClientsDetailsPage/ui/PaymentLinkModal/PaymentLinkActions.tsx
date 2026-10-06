import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack } from '@/shared/ui/Stack';
import s from './PaymentLinkModal.module.scss';

interface PaymentLinkActionsProps {
    payersCount: number;
    checkoutUrl: string;
    isLoading: boolean;
    onClose: () => void;
    onCreate: () => void;
    onCopy: () => void;
    onOpen: () => void;
}

export const PaymentLinkActions = memo((props: PaymentLinkActionsProps) => {
    const { t } = useTranslation();
    const { payersCount, checkoutUrl, isLoading, onClose, onCreate, onCopy, onOpen } = props;

    return (
        <HStack className={s.actions} gap="16" justify="end" wrap="wrap">
            <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isLoading}>{t('Закрыть')}</Button>
            {checkoutUrl ? (
                <>
                    <Button theme={ButtonTheme.OUTLINE} onClick={onCopy}>{t('Скопировать')}</Button>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onOpen}>{t('Открыть')}</Button>
                </>
            ) : (
                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onCreate} disabled={isLoading || !payersCount}>
                    {isLoading ? 'Создание...' : 'Создать ссылку'}
                </Button>
            )}
        </HStack>
    );
});
