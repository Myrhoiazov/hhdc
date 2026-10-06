import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Choreographer } from '@/entities/DanceGroup';
import s from './ScheduleSettingsPage.module.scss';

interface GroupFiltersProps {
    styles: string[];
    choreographers: Choreographer[];
    filterStyle: string;
    setFilterStyle: (value: string) => void;
    filterLevel: string;
    setFilterLevel: (value: string) => void;
    filterChoreographer: string;
    setFilterChoreographer: (value: string) => void;
    onReset: () => void;
}

export const GroupFilters = memo(function GroupFilters(props: GroupFiltersProps) {
    const { t } = useTranslation();
    return (
        <div className={s.filters}>
            <select
                className={s.filterSelect}
                value={props.filterStyle}
                onChange={(e) => props.setFilterStyle(e.target.value)}
            >
                <option value="">{t('Все стили')}</option>
                {props.styles.map((st) => (
                    <option key={st} value={st}>
                        {st}
                    </option>
                ))}
            </select>

            <select
                className={s.filterSelect}
                value={props.filterLevel}
                onChange={(e) => props.setFilterLevel(e.target.value)}
            >
                <option value="">{t('Все уровни')}</option>
                <option value="START">{t('Start')}</option>
                <option value="FAN">{t('Fan')}</option>
                <option value="PRO">{t('Pro')}</option>
            </select>

            <select
                className={s.filterSelect}
                value={props.filterChoreographer}
                onChange={(e) => props.setFilterChoreographer(e.target.value)}
            >
                <option value="">{t('Все хореографы')}</option>
                {props.choreographers.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                    </option>
                ))}
            </select>

            <button className={s.resetBtn} onClick={props.onReset}>
                {t('Сбросить')}
            </button>
        </div>
    );
});
