import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientsPageFilters.module.scss';
import { useTranslation } from 'react-i18next';

interface ClientsPageFiltersProps {
    className?: string;
}

const ClientsPageFilters = ({ className }: ClientsPageFiltersProps) => {
    const { t } = useTranslation();
    return <div className={classNames(s.ClientsPageFilters, {}, [className])}>{t('Фильтры')}</div>;
};

export default memo(ClientsPageFilters);
