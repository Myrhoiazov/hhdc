import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { Select } from '@/shared/ui/Select/Select';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { subscriptionStatusOptions, yesNoOptions, type MollieCustomersFiltersState, type SubscriptionStatusFilter, type YesNoAllFilter } from './useMollieCustomersFilters';
import s from './MollieCustomers.module.scss';

interface MollieCustomersFiltersProps {
    filters: MollieCustomersFiltersState;
    isLoading: boolean;
    onSearch: (value: string) => void;
    onSubscriptionStatus: (value: SubscriptionStatusFilter) => void;
    onHasSubscriptions: (value: YesNoAllFilter) => void;
    onHasMandates: (value: YesNoAllFilter) => void;
    onApply: () => void;
    onReset: () => void;
}

export const MollieCustomersFiltersBar = memo(({
    filters, isLoading, onSearch, onSubscriptionStatus,
    onHasSubscriptions, onHasMandates, onApply, onReset,
}: MollieCustomersFiltersProps) => {
    const { t } = useTranslation();

    return (
        <div className={s.filters}>
            <Input className={s.filterInput} label="Поиск" placeholder="Имя, email или Mollie ID" value={filters._q} onChange={onSearch} fullWidth />
            <Select<SubscriptionStatusFilter> className={s.filterSelect} label="Активность" value={filters.subscriptionStatus} options={subscriptionStatusOptions} onChange={onSubscriptionStatus} />
            <Select<YesNoAllFilter> className={s.filterSelect} label="Подписки" value={filters.hasSubscriptions} options={yesNoOptions} onChange={onHasSubscriptions} />
            <Select<YesNoAllFilter> className={s.filterSelect} label="Мандаты" value={filters.hasMandates} options={yesNoOptions} onChange={onHasMandates} />
            <div className={s.filterActions}>
                <Button className={s.applyButton} theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onApply} disabled={isLoading}>{t('Применить')}</Button>
                <Button className={s.resetButton} theme={ButtonTheme.OUTLINE} onClick={onReset} disabled={isLoading}>{t('Сбросить')}</Button>
            </div>
        </div>
    );
});
