import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import own from './Chart.module.scss';
import { share } from './share';

// Shared by the reports of the CRM (dashboard, event sales, finance): the tile, the bar and
// the styles of the rows they sit in.
export { own as chartStyles };

interface BarProps {
    value: number;
    largest: number;
    title: string;
    className?: string;
}

export const Bar = memo(({ value, largest, title, className }: BarProps) => (
    <span className={`${own.barTrack} ${className ?? ''}`} title={title}>
        <span className={own.bar} style={{ width: share(value, largest) }} />
    </span>
));

export const Tile = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return (
        <div className={own.tile}>
            <span className={own.tileLabel}>{t(label)}</span>
            <span className={own.tileValue}>{children}</span>
        </div>
    );
});
