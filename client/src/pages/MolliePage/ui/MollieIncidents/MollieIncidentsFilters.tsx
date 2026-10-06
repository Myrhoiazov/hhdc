import { Dispatch, memo, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { IncidentFilters, IncidentTypeFilter } from './useMollieIncidents';
import s from './MollieIncidents.module.scss';

const typeOptions: SelectOption<IncidentTypeFilter>[] = [
    { value: 'all', content: 'Все проблемы' },
    { value: 'payments', content: 'Платежи' },
    { value: 'subscriptions', content: 'Подписки' },
    { value: 'customers', content: 'Клиенты' },
];

interface MollieIncidentsFiltersProps {
    filters: IncidentFilters;
    setFilters: Dispatch<SetStateAction<IncidentFilters>>;
    isLoading: boolean;
    onApplyFilters: () => void;
    onResetFilters: () => void;
}

export const MollieIncidentsFilters = memo((props: MollieIncidentsFiltersProps) => {
    const { filters, setFilters, isLoading, onApplyFilters, onResetFilters } = props;
    const { t } = useTranslation();

    return (
        <div className={s.filters}>
            <Input
                className={s.filterInput}
                label="Поиск"
                placeholder="Ученик, плательщик, email, Mollie ID, подписка"
                value={filters._q}
                onChange={(value) => setFilters((prev) => ({ ...prev, _q: value }))}
                fullWidth
            />
            <Select<IncidentTypeFilter>
                className={s.filterSelect}
                label="Тип"
                value={filters.type}
                options={typeOptions}
                onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
            />
            <div className={s.filterActions}>
                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onApplyFilters} disabled={isLoading}>
                    {t('Применить')}
                </Button>
                <Button className={s.resetButton} theme={ButtonTheme.OUTLINE} onClick={onResetFilters} disabled={isLoading}>
                    {t('Сбросить')}
                </Button>
            </div>
        </div>
    );
});
