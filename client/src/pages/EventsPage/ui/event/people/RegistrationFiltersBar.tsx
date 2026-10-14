import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { REGISTRATION_STATUSES, RegistrationFilters } from '@/entities/Registration';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { listStyles as own } from '@/shared/ui/ListTable';

interface FiltersProps {
    filters: RegistrationFilters;
    filtered: boolean;
    onChange: (patch: Partial<RegistrationFilters>) => void;
    onReset: () => void;
}

export const RegistrationFiltersBar = memo(
    ({ filters, filtered, onChange, onReset }: FiltersProps) => {
        const { t } = useTranslation();
        return (
            <div className={own.filters}>
                <div className={own.search}>
                    <Field label="Search by name, email or phone">
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
                            onChange({
                                status: event.target.value as RegistrationFilters['status'],
                            })
                        }
                    >
                        <option value="">{t('Any status')}</option>
                        {REGISTRATION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {t(status)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Button disabled={!filtered} onClick={onReset}>
                    {t('Reset filters')}
                </Button>
            </div>
        );
    }
);
