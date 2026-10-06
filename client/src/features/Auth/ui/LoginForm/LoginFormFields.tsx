import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import cls from './LoginForm.module.scss';

interface LoginFormFieldsProps {
    email: string;
    password: string;
    onChangeEmail: (value: string) => void;
    onChangePassword: (value: string) => void;
}

export const LoginFormFields = ({
    email,
    password,
    onChangeEmail,
    onChangePassword,
}: LoginFormFieldsProps) => {
    const { t } = useTranslation();

    return (
        <div className={cls.fields}>
            <Input
                fullWidth
                label={t('Электронная почта')}
                autofocus
                type="email"
                className={cls.input}
                placeholder={t('name@company.com')}
                onChange={onChangeEmail}
                value={email}
                autoComplete="email"
            />
            <Input
                fullWidth
                label={t('Пароль')}
                type="password"
                className={cls.input}
                placeholder={t('Введите пароль')}
                onChange={onChangePassword}
                value={password}
                autoComplete="current-password"
            />
        </div>
    );
};
