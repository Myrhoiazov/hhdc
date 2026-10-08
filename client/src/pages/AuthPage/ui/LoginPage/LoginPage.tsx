import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/features/Auth';
import Calendar from '@/shared/assets/icons/calendar-20-20.svg';
import Bell from '@/shared/assets/icons/bell.svg';
import Check from '@/shared/assets/icons/check.svg';
import People from '@/shared/assets/icons/clients.svg';
import Knowledge from '@/shared/assets/icons/content-hub.svg';
import Settings from '@/shared/assets/icons/crm-settings.svg';
import Euro from '@/shared/assets/icons/euro.svg';
import Mail from '@/shared/assets/icons/mail-20-20.svg';
import logo from '@/shared/assets/logo/hhdc-logo.png';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Fill, Icon } from '@/shared/ui/Icon/Icon';
import { LangSwitcher } from '@/shared/ui/LangSwitcher/LangSwitcher';
import { Page } from '@/widgets/Page/Page';
import s from './LoginPage.module.scss';

interface LoginPageProps {
    className?: string;
}

interface Section { label: string; Svg: React.FC<React.SVGProps<SVGSVGElement>>; color?: Fill }

// What the CRM holds, shown as columns of tiles; every other column sits lower.
const COLUMNS: Section[][] = [
    [{ label: 'People', Svg: People }, { label: 'Events', Svg: Calendar }],
    [{ label: 'Tickets', Svg: Check, color: 'stroke' }, { label: 'Email', Svg: Mail }, { label: 'Finance', Svg: Euro, color: 'stroke' }],
    [{ label: 'Choreographers', Svg: People }, { label: 'Knowledge', Svg: Knowledge, color: 'stroke' }],
    [{ label: 'Campaigns', Svg: Mail }, { label: 'Automations', Svg: Settings, color: 'stroke' }, { label: 'Notifications', Svg: Bell, color: 'stroke' }],
];

const SectionTile = memo(({ section }: { section: Section }) => {
    const { t } = useTranslation();
    return <div className={s.tile}>
        <Icon Svg={section.Svg} color={section.color} width={28} height={28} className={section.color === 'stroke' ? s.tileStroke : s.tileFill} aria-hidden="true" />
        <span className={s.tileLabel}>{t(`Login section: ${section.label}`)}</span>
    </div>;
});

const Showcase = memo(() => {
    const { t } = useTranslation();
    return <section className={s.showcase} aria-label={t('High Heels Dance Camp')}>
        <h2 className={s.showcaseTitle}>{t('High Heels Dance Camp')}</h2>
        <p className={s.showcaseText}>{t('People, tickets, mail and money of the event in one workspace')}</p>
        <div className={s.tiles} aria-hidden="true">
            {COLUMNS.map((column) => <div className={s.tileColumn} key={column[0].label}>
                {column.map((section) => <SectionTile key={section.label} section={section} />)}
            </div>)}
        </div>
        <footer className={s.footer}>
            <img className={s.footerLogo} src={logo} alt="" />
            <span>{t('© {{year}} HHDC. Internal workspace of the team.', { year: new Date().getFullYear() })}</span>
        </footer>
    </section>;
});

const LoginPage = ({ className }: LoginPageProps) => {
    const { t } = useTranslation();
    return (
        <Page className={classNames(s.LoginPage, {}, [className])}>
            <div className={s.layout}>
                <div className={s.formColumn}>
                    <LoginForm />
                    <div className={s.underCard}>
                        <span className={s.supportText}>{t('Проблемы со входом? Обратитесь к администратору.')}</span>
                        <LangSwitcher />
                    </div>
                </div>
                <Showcase />
            </div>
        </Page>
    );
};

export default memo(LoginPage);
