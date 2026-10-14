import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import own from './FinanceLedger.module.scss';
import { LedgerView } from '../model/useLedger';

const VIEWS: Array<[LedgerView, string]> = [
    ['dates', 'By date'],
    ['categories', 'By category'],
];

export const ViewSwitch = memo(
    ({ view, onChange }: { view: LedgerView; onChange: (view: LedgerView) => void }) => {
        const { t } = useTranslation();
        return (
            <div className={own.views} role="group" aria-label={t('Show')}>
                {VIEWS.map(([name, label]) => (
                    <Button
                        key={name}
                        className={view === name ? own.viewActive : undefined}
                        aria-pressed={view === name}
                        onClick={() => onChange(name)}
                    >
                        {t(label)}
                    </Button>
                ))}
            </div>
        );
    }
);
