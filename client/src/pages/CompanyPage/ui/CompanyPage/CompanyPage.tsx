import { Outlet, NavLink } from 'react-router-dom';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { HStack } from '@/shared/ui/Stack';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import cls from './CompanyPage.module.scss';
import { classNames } from '@/shared/lib/classNames/classNames';

const CompanyPage = () => {
    const { t } = useTranslation();

    return (
        <Page>
            <Text title="Компания" bold size="l" />
            <HStack gap="8" className={cls.nav}>
                <NavLink
                    to="/company"
                    end
                    className={({ isActive }) => classNames(cls.navLink, { [cls.active]: isActive })}
                >
                    {t('Главная')}
                </NavLink>
                <NavLink
                    to="/company/customers"
                    className={({ isActive }) => classNames(cls.navLink, { [cls.active]: isActive })}
                >
                    {t('Клиенты')}
                </NavLink>
                <NavLink
                    to="/company/payments"
                    className={({ isActive }) => classNames(cls.navLink, { [cls.active]: isActive })}
                >
                    {t('Платежи')}
                </NavLink>
                <NavLink
                    to="/company/payments-matrix"
                    className={({ isActive }) => classNames(cls.navLink, { [cls.active]: isActive })}
                >
                    {t('Матрица оплат')}
                </NavLink>
                <NavLink
                    to="/company/incidents"
                    className={({ isActive }) => classNames(cls.navLink, { [cls.active]: isActive })}
                >
                    {t('Инциденты')}
                </NavLink>
            </HStack>
            <Suspense fallback={<ListSkeleton rows={5} height={68} />}>
                <Outlet />
            </Suspense>
        </Page>
    );
};

export default CompanyPage;
