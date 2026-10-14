import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Event } from '@/entities/Event';
import { LEDGER_CATEGORIES, LedgerFilters } from '@/entities/Finance';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { listStyles as table } from '@/shared/ui/ListTable';
import { useLedgerText } from '../model/useLedgerText';

interface FiltersProps {
    filters: LedgerFilters;
    events: Event[];
    filtered: boolean;
    onChange: (patch: Partial<LedgerFilters>) => void;
    onReset: () => void;
}

export const LedgerFiltersBar = memo(
    ({ filters, events, filtered, onChange, onReset }: FiltersProps) => {
        const { t } = useTranslation();
        const text = useLedgerText();
        return (
            <div className={table.filters}>
                <div className={table.search}>
                    <Field label="Search by person, event or description">
                        <input
                            type="search"
                            value={filters.q}
                            onChange={(event) => onChange({ q: event.target.value })}
                        />
                    </Field>
                </div>
                <Field label="Category">
                    <select
                        value={filters.category}
                        onChange={(event) =>
                            onChange({ category: event.target.value as LedgerFilters['category'] })
                        }
                    >
                        <option value="">{t('Any category')}</option>
                        {LEDGER_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {text.category(category)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Event">
                    <select
                        value={filters.eventId}
                        onChange={(event) => onChange({ eventId: event.target.value })}
                    >
                        <option value="">{t('Any event')}</option>
                        {events.map((event) => (
                            <option key={event.id} value={event.id}>
                                {event.name}
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
