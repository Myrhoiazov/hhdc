import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderConnection } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from '../CommunicationsPage.module.scss';

type MailView = 'letters' | 'accounts';

interface NavigationProps {
    view: MailView;
    providers: ProviderConnection[];
    onViewChange: (view: MailView) => void;
}

export const MailboxNavigation = memo(({ view, providers, onViewChange }: NavigationProps) => {
    const { t } = useTranslation();
    if (providers.length < 2) return null;
    return <nav className={cls.viewTabs} aria-label={t('Email sections')}>
        <Button theme={ButtonTheme.CLEAR} className={view === 'letters' ? cls.activeTab : ''}
            onClick={() => onViewChange('letters')}>{t('Letters')}</Button>
        <Button theme={ButtonTheme.CLEAR} className={view === 'accounts' ? cls.activeTab : ''}
            onClick={() => onViewChange('accounts')}>{t('Accounts')}</Button>
    </nav>;
});

export const AccountOverview = memo(({ providers }: { providers: ProviderConnection[] }) => {
    const { t } = useTranslation();
    return <section className={cls.accountOverview} aria-label={t('Connected email accounts')}>
        <div className={cls.sectionHeading}>
            <div><h2>{t('Email accounts')}</h2><p>{t('Choose an account from Letters to filter the inbox.')}</p></div>
            <Link className={cls.manageLink} to="/settings/providers">{t('Manage providers')}</Link>
        </div>
        <div className={cls.accountGrid}>{providers.map((provider) => <article className={cls.accountCard} key={provider.id}>
            <span className={cls.accountMark} aria-hidden="true">@</span>
            <div><strong>{provider.name}</strong><p>{t(provider.provider)}</p></div>
            <span className={cls.accountStatus}>{t(provider.status)}</span>
        </article>)}</div>
    </section>;
});
