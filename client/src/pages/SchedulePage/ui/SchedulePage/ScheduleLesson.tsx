import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DanceGroup } from '@/entities/DanceGroup';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { getStyleColorSlot } from '@/shared/lib/styleColor/styleColor';
import { levelLabel, personName, searchLink } from '../../lib/scheduleUtils';
import s from './SchedulePage.module.scss';

interface ScheduleLessonProps {
    group: DanceGroup;
    startTime: string;
    endTime: string;
    dayKey: string;
}

export const ScheduleLesson = memo(({ group, startTime, endTime, dayKey }: ScheduleLessonProps) => {
    const { t } = useTranslation();

    return (
        <article className={`${s.lesson} ${s[`style${getStyleColorSlot(group.style)}`]}`} key={`${group.id}-${startTime}-${dayKey}`}>
            <div className={s.lessonTitle}><strong>{group.name}</strong><span>{t('Группа')}</span></div>
            <b>{startTime}–{endTime}</b>
            <p>{t('Стиль: ')}<Link className={s.relationLink} to={searchLink(RoutePath.dance_styles, group.style)}>{group.style}</Link></p>
            <p>{t('Хореограф: ')}<Link className={s.relationLink} to={searchLink(RoutePath.choreographers, personName(group))}>{personName(group)}</Link></p>
            <p>{t('Уровень: {{level}}', { level: levelLabel[group.level] ?? group.level })}</p>
            <p>{t('Филиал: ')}{group.branch ? (
                <Link className={s.relationLink} to={searchLink(RoutePath.branches, group.branch.name)}>{group.branch.name}</Link>
            ) : 'Не указан'}</p>
        </article>
    );
});