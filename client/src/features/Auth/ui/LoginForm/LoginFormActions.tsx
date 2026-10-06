import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { VStack } from '@/shared/ui/Stack';
import cls from './LoginForm.module.scss';

interface LoginFormActionsProps {
    isLoading: boolean;
}

export const LoginFormActions = ({ isLoading }: LoginFormActionsProps) => {
    const { t } = useTranslation();

    return (
        <VStack gap="16" align="center">
            <Button
                type="submit"
                theme={ButtonTheme.BACKGROUND_INVERTED}
                className={cls.loginBtn}
                disabled={isLoading}
                fullWidth
            >
                {isLoading ? t('Выполняется вход...') : t('Войти')}
            </Button>
            <Button theme={ButtonTheme.CLEAR} className={cls.forgot}>
                {t('Забыли пароль?')}
            </Button>
        </VStack>
    );
};
