import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Suspense } from 'react';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { Text } from '@/shared/ui/Text/Text';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MolliePage.module.scss';

const MolliePage = () => {
    const { t } = useTranslation('');

    const tabClassName = ({ isActive }: { isActive: boolean }) => classNames(s.tab, { [s.activeTab]: isActive });

    return (
        <Page>
            <Text title={t('Mollie Dashboard')} bold size="l" />
            <div className={s.tabs}>
                <NavLink to="/mollie" end className={tabClassName}>{t('Main')}</NavLink>
                <NavLink to="/mollie/customers" className={tabClassName}>{t('Clients')}</NavLink>
                <NavLink to="/mollie/payments" className={tabClassName}>{t('Payments')}</NavLink>
                <NavLink to="/mollie/payments-matrix" className={tabClassName}>{t('Матрица оплат')}</NavLink>
                <NavLink to="/mollie/incidents" className={tabClassName}>{t('Incidents')}</NavLink>
            </div>
            <Suspense fallback={<ListSkeleton rows={5} height={68} />}>
                <Outlet />
            </Suspense>
        </Page>
    );
};

export default MolliePage;
