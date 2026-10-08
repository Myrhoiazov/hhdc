import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import own from './Charts.module.scss';

// Shared by the reports of the CRM (dashboard, event sales, finance): the tile, the bar and
// the styles of the rows they sit in.
export { own as chartStyles };

const PERCENT = 100;

// Width of a bar as a share of the largest value shown next to it.
const share = (value: number, largest: number): string => `${largest > 0 ? Math.max(0, (value / largest) * PERCENT) : 0}%`;

interface BarProps { value: number; largest: number; title: string; className?: string }

export const Bar = memo(({ value, largest, title, className }: BarProps) => (
    <span className={`${own.barTrack} ${className ?? ''}`} title={title}><span className={own.bar} style={{ width: share(value, largest) }} /></span>
));

export const Tile = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <div className={own.tile}><span className={own.tileLabel}>{t(label)}</span><span className={own.tileValue}>{children}</span></div>;
});
