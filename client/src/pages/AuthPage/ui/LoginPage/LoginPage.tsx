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
                        <div className={s.brandMark} aria-label="DDC" />
                        <div className={s.brandBadge}>{t('Dance CRM')}</div>
                    </div>
                    <div className={s.brandContent}>
                        <p className={s.eyebrow}>{t('Управление танцевальной школой')}</p>
                        <h1>{t('Ритм школы под вашим контролем')}</h1>
                        <p className={s.description}>
                            {t('Расписание, группы, ученики и финансы в едином рабочем пространстве.')}
                        </p>
                        <div className={s.featureGrid}>
                            <div className={s.featureCard}>
                                <span className={s.featureIndex} aria-hidden="true" />
                                <span>{t('Расписание занятий')}</span>
                            </div>
                            <div className={s.featureCard}>
                                <span className={s.featureIndex} aria-hidden="true" />
                                <span>{t('Ученики и группы')}</span>
                            </div>
                            <div className={s.featureCard}>
                                <span className={s.featureIndex} aria-hidden="true" />
                                <span>{t('Посещаемость и оплаты')}</span>
                            </div>
                        </div>
                    </div>
                    <div className={s.securityNote}>
                        <span className={s.securityIcon} aria-hidden="true" />
                        <span>{t('Внутренняя система команды DDC')}</span>
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
