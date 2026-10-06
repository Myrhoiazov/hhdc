import { Fragment, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DanceGroup } from '@/entities/DanceGroup';
import { addDays, buildScheduleMap, buildTimeSlots, DAYS, formatShortDate } from '../../lib/scheduleUtils';
import { ScheduleLesson } from './ScheduleLesson';
import s from './SchedulePage.module.scss';

interface ScheduleGridProps {
    filteredGroups: DanceGroup[];
    loading: boolean;
    weekStart: Date;
}

export const ScheduleGrid = memo(({ filteredGroups, loading, weekStart }: ScheduleGridProps) => {
    const { t } = useTranslation();
    const times = useMemo(() => buildTimeSlots(filteredGroups), [filteredGroups]);
    const schedule = useMemo(() => buildScheduleMap(filteredGroups), [filteredGroups]);
    const weekDates = useMemo(() => DAYS.map((_, index) => addDays(weekStart, index)), [weekStart]);

    return (
        <div className={s.tableWrap}>
            <div className={s.grid}>
                <div className={`${s.cell} ${s.timeHeader}`}>{t('Время')}</div>
                {DAYS.map((item, index) => (
                    <div className={`${s.cell} ${s.dayHeader}`} key={item.key}>
                        <strong>{item.short}</strong>
                        <span>{formatShortDate(weekDates[index])}</span>
                    </div>
                ))}
                {loading ? <div className={s.loading}>Загружаем расписание...</div> : !times.length ? <div className={s.loading}>{t('В расписании пока нет доступных занятий.')}</div> : times.map((time) => (
                    <Fragment key={time}>
                        <div className={`${s.cell} ${s.timeCell}`} key={`${time}-time`}>{time}</div>
                        {DAYS.map((item) => (
                            <div className={`${s.cell} ${s.scheduleCell}`} key={`${time}-${item.key}`}>
                                {(schedule.get(`${time}-${item.key}`) ?? []).map(({ group, startTime, endTime }) => (
                                    <ScheduleLesson
                                        key={`${group.id}-${startTime}-${item.key}`}
                                        group={group}
                                        startTime={startTime}
                                        endTime={endTime}
                                        dayKey={item.key}
                                    />
                                ))}
                            </div>
                        ))}
                    </Fragment>
                ))}
            </div>
        </div>
    );
});