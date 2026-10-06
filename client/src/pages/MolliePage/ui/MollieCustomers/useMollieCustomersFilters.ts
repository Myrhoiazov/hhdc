import { useCallback, useState } from 'react';
import type { SelectOption } from '@/shared/ui/Select/Select';

export type YesNoAllFilter = 'all' | 'yes' | 'no';
export type SubscriptionStatusFilter = 'all' | 'active' | 'not_active';

export interface MollieCustomersFiltersState {
    _q: string;
    hasSubscriptions: YesNoAllFilter;
    hasMandates: YesNoAllFilter;
    subscriptionStatus: SubscriptionStatusFilter;
}

export const defaultFilters: MollieCustomersFiltersState = {
    _q: '',
    hasSubscriptions: 'all',
    hasMandates: 'all',
    subscriptionStatus: 'all',
};

export const yesNoOptions: SelectOption<YesNoAllFilter>[] = [
    { value: 'all', content: 'Все' },
    { value: 'yes', content: 'Есть' },
    { value: 'no', content: 'Нет' },
];

export const subscriptionStatusOptions: SelectOption<SubscriptionStatusFilter>[] = [
    { value: 'all', content: 'Все клиенты' },
    { value: 'active', content: 'С активной подпиской' },
    { value: 'not_active', content: 'Без активной подписки' },
];

export const useMollieCustomersFilters = () => {
    const [filters, setFilters] = useState<MollieCustomersFiltersState>(defaultFilters);

    const onChangeSearch = useCallback((value: string) => {
        setFilters((prev) => ({ ...prev, _q: value }));
    }, []);

    const onChangeSubscriptionStatus = useCallback((value: SubscriptionStatusFilter) => {
        setFilters((prev) => ({ ...prev, subscriptionStatus: value }));
    }, []);

    const onChangeHasSubscriptions = useCallback((value: YesNoAllFilter) => {
        setFilters((prev) => ({ ...prev, hasSubscriptions: value }));
    }, []);

    const onChangeHasMandates = useCallback((value: YesNoAllFilter) => {
        setFilters((prev) => ({ ...prev, hasMandates: value }));
    }, []);

    const resetFilters = useCallback(() => setFilters(defaultFilters), []);

    return {
        filters, setFilters, defaultFilters,
        onChangeSearch, onChangeSubscriptionStatus,
        onChangeHasSubscriptions, onChangeHasMandates, resetFilters,
    };
};
