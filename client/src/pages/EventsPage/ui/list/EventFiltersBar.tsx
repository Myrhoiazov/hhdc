import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { EVENT_STATUSES, EventFilters } from '@/entities/Event';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { listStyles as own } from '@/shared/ui/ListTable';

interface FiltersProps {
    filters: EventFilters;
    filtered: boolean;
    onChange: (patch: Partial<EventFilters>) => void;
    onReset: () => void;
}

export const EventFiltersBar = memo(({ filters, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    return (
        <div className={own.filters}>
            <div className={own.search}>
                <Field label="Search by name, venue or city">
                    <input
                        type="search"
                        value={filters.q}
                        onChange={(event) => onChange({ q: event.target.value })}
                    />
                </Field>
            </div>
            <Field label="Status">
                <select
                    value={filters.status}
                    onChange={(event) =>
                        onChange({ status: event.target.value as EventFilters['status'] })
                    }
                >
                    <option value="">{t('Any status')}</option>
                    {EVENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {t(status)}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Period">
                <select
                    value={filters.period}
                    onChange={(event) =>
                        onChange({ period: event.target.value as EventFilters['period'] })
                    }
                >
                    <option value="">{t('Any time')}</option>
                    <option value="upcoming">{t('Upcoming and running')}</option>
                    <option value="past">{t('Past')}</option>
                </select>
            </Field>
            <Button disabled={!filtered} onClick={onReset}>
                {t('Reset filters')}
            </Button>
        </div>
    );
});
