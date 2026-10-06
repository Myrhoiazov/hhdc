import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DanceGroup } from '@/entities/DanceGroup';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { addDays, buildFilterOptions, DAYS, startOfWeek } from '../../lib/scheduleUtils';
import s from './SchedulePage.module.scss';

interface ScheduleToolbarProps {
    groups: DanceGroup[];
    weekStart: Date;
    onChangeWeekStart: (date: Date) => void;
    choreographer: string;
    onChangeChoreographer: (value: string) => void;
    style: string;
    onChangeStyle: (value: string) => void;
    branch: string;
    onChangeBranch: (value: string) => void;
    day: string;
    onChangeDay: (value: string) => void;
}

export const ScheduleToolbar = memo((props: ScheduleToolbarProps) => {
    const {
        groups,
        weekStart,
        onChangeWeekStart,
        choreographer,
        onChangeChoreographer,
        style,
        onChangeStyle,
        branch,
        onChangeBranch,
        day,
        onChangeDay,
    } = props;
    const { t } = useTranslation();
    const options = useMemo(() => buildFilterOptions(groups), [groups]);

    return (
        <section className={s.controls}>
            <div className={s.topControls}>
                <div className={s.tabs}>
                    <button className={s.activeTab}>{t('Все расписание')}</button>
                    <button>{t('Группы')}</button>
                </div>
                <button className={s.navButton} onClick={() => onChangeWeekStart(addDays(weekStart, -7))}>‹</button>
                <button className={s.todayButton} onClick={() => onChangeWeekStart(startOfWeek(new Date()))}>{t('Сегодня')}</button>
                <button className={s.navButton} onClick={() => onChangeWeekStart(addDays(weekStart, 7))}>›</button>
                <span className={s.viewMode}>{t('Неделя')}</span>
                <Link className={s.addButton} to={RoutePath.schedule_settings}>{t('+ Добавить группу')}</Link>
            </div>
            <div className={s.filters}>
                <label>{t('Дата')}<input type="date" value={weekStart.toISOString().slice(0, 10)} onChange={(event) => onChangeWeekStart(startOfWeek(new Date(`${event.target.value}T00:00:00`)))} /></label>
                <label>{t('Хореограф')}<select value={choreographer} onChange={(event) => onChangeChoreographer(event.target.value)}><option value="">{t('Все')}</option>{options.choreographers.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>{t('Стиль')}<select value={style} onChange={(event) => onChangeStyle(event.target.value)}><option value="">{t('Все')}</option>{options.styles.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>{t('Филиал')}<select value={branch} onChange={(event) => onChangeBranch(event.target.value)}><option value="">{t('Все')}</option>{options.branches.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>{t('День недели')}<select value={day} onChange={(event) => onChangeDay(event.target.value)}><option value="">{t('Все дни')}</option>{DAYS.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}</select></label>
            </div>
        </section>
    );
});