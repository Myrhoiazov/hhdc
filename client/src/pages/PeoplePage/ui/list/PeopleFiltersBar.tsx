import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PeopleFilters, PERSON_ROLES as ROLES, PERSON_SOURCES } from '@/entities/Person';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { listStyles as own } from '@/shared/ui/ListTable';

interface FiltersProps {
    filters: PeopleFilters;
    filtered: boolean;
    onChange: (patch: Partial<PeopleFilters>) => void;
    onReset: () => void;
}

export const PeopleFiltersBar = memo(({ filters, filtered, onChange, onReset }: FiltersProps) => {
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
            <Field label="Role">
                <select
                    value={filters.role}
                    onChange={(event) =>
                        onChange({ role: event.target.value as PeopleFilters['role'] })
                    }
                >
                    <option value="">{t('Any role')}</option>
                    {ROLES.map((role) => (
                        <option key={role} value={role}>
                            {t(role)}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Source">
                <select
                    value={filters.source}
                    onChange={(event) =>
                        onChange({ source: event.target.value as PeopleFilters['source'] })
                    }
                >
                    <option value="">{t('Any source')}</option>
                    {PERSON_SOURCES.map((source) => (
                        <option key={source} value={source}>
                            {t(`Person source: ${source}`)}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Purchases filter">
                <select
                    value={filters.purchases}
                    onChange={(event) =>
                        onChange({ purchases: event.target.value as PeopleFilters['purchases'] })
                    }
                >
                    <option value="">{t('With or without purchases')}</option>
                    <option value="yes">{t('With purchases')}</option>
                    <option value="no">{t('Without purchases')}</option>
                </select>
            </Field>
            <Button disabled={!filtered} onClick={onReset}>
                {t('Reset filters')}
            </Button>
        </div>
    );
});
