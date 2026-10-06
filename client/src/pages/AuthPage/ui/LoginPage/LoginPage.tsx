import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './LoginPage.module.scss';
import { LoginForm } from '@/features/Auth';
import { Page } from '@/widgets/Page/Page';
import { useTranslation } from 'react-i18next';

interface LoginPageProps {
    className?: string;
}

const LoginPage = ({ className }: LoginPageProps) => {
    const { t } = useTranslation();

    return (
        <Page className={classNames(s.LoginPage, {}, [className])}>
            <div className={s.backgroundGlow} />
            <div className={s.loginLayout}>
                <section className={s.brandPanel}>
                    <div className={s.brandHeader}>
                        <div className={s.brandMark} aria-label="HHDC" />
                        <div className={s.brandBadge}>{t('Event Admin')}</div>
                    </div>
                    <div className={s.brandContent}>
                        <p className={s.eyebrow}>{t('Админ-панель танцевального ивента')}</p>
                        <h1>{t('High Heels Dance Camp')}</h1>
                        <p className={s.description}>
                            {t('Клиенты, коммуникации, оплаты и материалы события в одном рабочем пространстве.')}
                        </p>
                        <div className={s.featureGrid}>
                            <div className={s.featureCard}>
                                <span className={s.featureIndex} aria-hidden="true" />
                                <span>{t('Клиенты и заявки')}</span>
                            </div>
                            <div className={s.featureCard}>
                                <span className={s.featureIndex} aria-hidden="true" />
                                <span>{t('Почта и коммуникации')}</span>
                            </div>
                            <div className={s.featureCard}>
                                <span className={s.featureIndex} aria-hidden="true" />
                                <span>{t('Оплаты и материалы')}</span>
                            </div>
                        </div>
                    </div>
                    <div className={s.securityNote}>
                        <span className={s.securityIcon} aria-hidden="true" />
                        <span>{t('Внутреннее пространство команды HHDC')}</span>
                    </div>
                </section>

                <div className={s.formPanel}>
                    <LoginForm />
                    <p className={s.supportText}>
                        {t('Проблемы со входом? Обратитесь к администратору.')}
                    </p>
                </div>
            </div>
        </Page>
    );
};

export default memo(LoginPage);
