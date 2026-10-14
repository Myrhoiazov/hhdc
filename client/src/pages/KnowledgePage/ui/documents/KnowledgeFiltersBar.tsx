import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { KnowledgeFilters } from '@/entities/Knowledge';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { listStyles as table } from '@/shared/ui/ListTable';
import { SCOPES, STATUSES } from '../../model/useKnowledgeList';

interface FiltersProps {
    filters: KnowledgeFilters;
    filtered: boolean;
    onChange: (patch: Partial<KnowledgeFilters>) => void;
    onReset: () => void;
}

export const KnowledgeFiltersBar = memo(
    ({ filters, filtered, onChange, onReset }: FiltersProps) => {
        const { t } = useTranslation();
        return (
            <div className={table.filters}>
                <div className={table.search}>
                    <Field label="Search by title">
                        <input
                            type="search"
                            value={filters.q}
                            onChange={(event) => onChange({ q: event.target.value })}
                        />
                    </Field>
                </div>
                <Field label="Scope">
                    <select
                        value={filters.scope}
                        onChange={(event) => onChange({ scope: event.target.value })}
                    >
                        <option value="">{t('Any scope')}</option>
                        {SCOPES.map((scope) => (
                            <option key={scope} value={scope}>
                                {t(`Knowledge scope: ${scope}`)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Status">
                    <select
                        value={filters.status}
                        onChange={(event) => onChange({ status: event.target.value })}
                    >
                        <option value="">{t('Any status')}</option>
                        {STATUSES.map((status) => (
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
