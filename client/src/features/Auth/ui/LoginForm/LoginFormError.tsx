import { useTranslation } from 'react-i18next';
import cls from './LoginForm.module.scss';

interface LoginFormErrorProps {
    error?: {
        status?: number;
        message?: string;
    };
}

export const LoginFormError = ({ error }: LoginFormErrorProps) => {
    const { t } = useTranslation();

    if (!error) {
        return null;
    }

    return (
        <div className={cls.error}>
            {error.status === 401
                ? t('Вы ввели неверный логин или пароль')
                : error.message || t('Не удалось выполнить вход')}
        </div>
    );
};
