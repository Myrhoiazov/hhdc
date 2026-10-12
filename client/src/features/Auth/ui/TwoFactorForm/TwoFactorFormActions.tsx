import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { VStack } from '@/shared/ui/Stack';
import cls from './TwoFactorForm.module.scss';

interface TwoFactorFormActionsProps {
    isVerifying: boolean;
    codeLength: number;
    isResending: boolean;
    secondsLeft: number;
    onResend: () => void;
    onBack: () => void;
}

export const TwoFactorFormActions = ({
    isVerifying,
    codeLength,
    isResending,
    secondsLeft,
    onResend,
    onBack,
}: TwoFactorFormActionsProps) => {
    const { t } = useTranslation();

    return (
        <VStack gap="16" align="center">
            <Button
                type="submit"
                theme={ButtonTheme.BACKGROUND_INVERTED}
                className={cls.submitBtn}
                disabled={isVerifying || codeLength !== 6}
                fullWidth
            >
                {isVerifying ? t('Проверка...') : t('Подтвердить')}
            </Button>

            <Button
                type="button"
                theme={ButtonTheme.CLEAR}
                disabled={isResending || secondsLeft > 0}
                onClick={onResend}
            >
                {isResending
                    ? t('Отправка...')
                    : secondsLeft > 0
                        ? t('Отправить код повторно через {{seconds}} с', { seconds: secondsLeft })
                        : t('Отправить код повторно')}
            </Button>

            <Button type="button" theme={ButtonTheme.CLEAR} className={cls.back} onClick={onBack}>
                {t('Назад')}
            </Button>
        </VStack>
    );
};
