import { Dispatch, memo, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { PaymentFilters, PaymentMethodFilter, PaymentStatusFilter } from './useMolliePayments';
import s from './MolliePayments.module.scss';

const statusOptions: SelectOption<PaymentStatusFilter>[] = [
    { value: 'all', content: 'Все статусы' },
    { value: 'paid', content: 'Paid' },
    { value: 'failed', content: 'Failed' },
    { value: 'canceled', content: 'Canceled' },
    { value: 'expired', content: 'Expired' },
    { value: 'pending', content: 'Pending' },
    { value: 'open', content: 'Open' },
];

const methodOptions: SelectOption<PaymentMethodFilter>[] = [
    { value: 'all', content: 'Все методы' },
    { value: 'directdebit', content: 'Direct debit' },
    { value: 'creditcard', content: 'Credit card' },
    { value: 'ideal', content: 'iDEAL' },
    { value: 'banktransfer', content: 'Bank transfer' },
    { value: 'paypal', content: 'PayPal' },
    { value: 'unknown', content: 'Unknown' },
];

interface MolliePaymentsFiltersProps {
    filters: PaymentFilters;
    setFilters: Dispatch<SetStateAction<PaymentFilters>>;
    isLoading: boolean;
    onApplyFilters: () => void;
    onResetFilters: () => void;
}

const FilterActionButtons = ({
    issueOnly,
    isLoading,
    onToggleIssueOnly,
    onApplyFilters,
    onResetFilters,
}: {
    issueOnly: boolean;
    isLoading: boolean;
    onToggleIssueOnly: () => void;
    onApplyFilters: () => void;
    onResetFilters: () => void;
}) => {
    const { t } = useTranslation('home');
    return (
        <div className={s.filterActions}>
            <Button
                className={s.compactButton}
                theme={issueOnly ? ButtonTheme.BACKGROUND_INVERTED : ButtonTheme.OUTLINE}
                onClick={onToggleIssueOnly}
            >
                {t('Проблемные')}
            </Button>
            <Button className={s.compactButton} theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onApplyFilters} disabled={isLoading}>
                {t('Применить')}
            </Button>
            <Button className={`${s.compactButton} ${s.resetButton}`} theme={ButtonTheme.OUTLINE} onClick={onResetFilters} disabled={isLoading}>
                {t('Сбросить')}
            </Button>
        </div>
    );
};

export const MolliePaymentsFilters = memo((props: MolliePaymentsFiltersProps) => {
    const { filters, setFilters, isLoading, onApplyFilters, onResetFilters } = props;

    return (
        <div className={s.filters}>
            <Input
                className={s.filterInput} label="Поиск" placeholder="ID, описание, клиент, email"
                value={filters._q} onChange={(value) => setFilters((prev) => ({ ...prev, _q: value }))} fullWidth
            />
            <Select<PaymentStatusFilter>
                className={s.filterSelect} label="Статус" value={filters.status} options={statusOptions}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value, issueOnly: false }))}
            />
            <Select<PaymentMethodFilter>
                className={s.filterSelect} label="Метод" value={filters.method} options={methodOptions}
                onChange={(value) => setFilters((prev) => ({ ...prev, method: value }))}
            />
            <Input
                className={s.filterInput} label="С даты" type="date" value={filters.dateFrom}
                onChange={(value) => setFilters((prev) => ({ ...prev, dateFrom: value }))} fullWidth
            />
            <Input
                className={s.filterInput} label="До даты" type="date" value={filters.dateTo}
                onChange={(value) => setFilters((prev) => ({ ...prev, dateTo: value }))} fullWidth
            />
            <FilterActionButtons
                issueOnly={filters.issueOnly} isLoading={isLoading}
                onToggleIssueOnly={() => setFilters((prev) => ({ ...prev, issueOnly: !prev.issueOnly, status: 'all' }))}
                onApplyFilters={onApplyFilters} onResetFilters={onResetFilters}
            />
        </div>
    );
});
