import { useTranslation } from 'react-i18next';
import logo from '@/shared/assets/logo/hhdc-logo.png';
import cls from './LoginForm.module.scss';

export const LoginFormHeader = () => {
    const { t } = useTranslation();

    return (
        <div className={cls.logoWrap}>
            <div className={cls.brand}>
                <img className={cls.logo} src={logo} alt="" />
                <span className={cls.brandName}>{t('HHDC Event CRM')}</span>
            </div>
            <h1 className={cls.header}>
                <span>{t('Welcome back!')}</span>
                <span>{t('Please sign in')}</span>
            </h1>
        </div>
    );
};
