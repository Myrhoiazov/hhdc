import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AuditFilters, AuditOptions } from '@/entities/Audit';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { listStyles as own } from '@/shared/ui/ListTable';

interface FiltersProps {
    filters: AuditFilters;
    options: AuditOptions;
    filtered: boolean;
    onChange: (patch: Partial<AuditFilters>) => void;
    onReset: () => void;
}

export const AuditFiltersBar = memo(
    ({ filters, options, filtered, onChange, onReset }: FiltersProps) => {
        const { t } = useTranslation();
        return (
            <div className={own.filters}>
                <div className={own.search}>
                    <Field label="Search by action">
                        <input
                            type="search"
                            value={filters.q}
                            onChange={(event) => onChange({ q: event.target.value })}
                        />
                    </Field>
                </div>
                <Field label="Record">
                    <select
                        value={filters.entityType}
                        onChange={(event) => onChange({ entityType: event.target.value })}
                    >
                        <option value="">{t('Any record')}</option>
                        {options.entityTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Staff member">
                    <select
                        value={filters.actorUserId}
                        onChange={(event) => onChange({ actorUserId: event.target.value })}
                    >
                        <option value="">{t('Anyone')}</option>
                        {options.actors.map((actor) => (
                            <option key={actor.id} value={actor.id}>
                                {actor.name || actor.email}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Period from">
                    <input
                        type="date"
                        value={filters.from}
                        max={filters.to || undefined}
                        onChange={(event) => onChange({ from: event.target.value })}
                    />
                </Field>
                <Field label="Period until">
                    <input
                        type="date"
                        value={filters.to}
                        min={filters.from || undefined}
                        onChange={(event) => onChange({ to: event.target.value })}
                    />
                </Field>
                <Button disabled={!filtered} onClick={onReset}>
                    {t('Reset filters')}
                </Button>
            </div>
        );
    }
);
