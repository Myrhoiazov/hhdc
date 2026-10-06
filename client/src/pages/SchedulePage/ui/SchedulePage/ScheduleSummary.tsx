import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DanceGroup } from '@/entities/DanceGroup';
import { addDays, formatDate } from '../../lib/scheduleUtils';
import s from './SchedulePage.module.scss';

interface ScheduleSummaryProps {
    weekStart: Date;
    filteredGroups: DanceGroup[];
}

export const ScheduleSummary = memo(({ weekStart, filteredGroups }: ScheduleSummaryProps) => {
    const { t } = useTranslation();
    const weekEnd = addDays(weekStart, 6);

    return (
        <div className={s.summary}>
            <span>{t('Период: {{start}} — {{end}}', { start: formatDate(weekStart), end: formatDate(weekEnd) })}</span>
            <span>{t('Группы: {{count}}', { count: filteredGroups.length })}</span>
            <span>{t('Занятий: {{count}}', { count: filteredGroups.reduce((total, group) => total + group.slots.length, 0) })}</span>
        </div>
    );
});