import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DanceGroup, GroupStatistics } from '@/entities/DanceGroup';
import s from './GroupCard.module.scss';

const DAY_SHORT: Record<string, string> = {
    Понедельник: 'Пн',
    Вторник: 'Вт',
    Среда: 'Ср',
    Четверг: 'Чт',
    Пятница: 'Пт',
    Суббота: 'Сб',
    Воскресенье: 'Вс',
};

const formatLessonPrice = (lessonPriceCents: number) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
}).format(lessonPriceCents / 100);

interface GroupCardMetaProps {
    group: DanceGroup;
    statistics?: GroupStatistics;
}

export const GroupCardMeta = memo(function GroupCardMeta({ group, statistics }: GroupCardMetaProps) {
    const { t } = useTranslation();
    const slotsText = group.slots
        .map((slot) => `${DAY_SHORT[slot.dayOfWeek] ?? slot.dayOfWeek} ${slot.startTime}–${slot.endTime}`)
        .join(', ');
    const choreographerName = [group.choreographer?.firstName, group.choreographer?.lastName]
        .filter(Boolean)
        .join(' ');

    return (
        <>
            <div className={s.meta}>
                {group.style}
                {choreographerName && <> · {choreographerName}</>}
            </div>
            {slotsText && <div className={s.slots}>{slotsText}</div>}
            <div className={s.hall}>
                {t('Филиал: ')}{group.branch?.name || 'Не указан'} · {statistics?.activeCount ?? 0}/{group.maxParticipants}{t(' активных')}
                {statistics?.inactiveCount ? ` · ${statistics.inactiveCount} неактивных` : ''}
                {' '}{t('· Занятие: ')}{formatLessonPrice(group.lessonPriceCents ?? 0)}
                {group.branch && (
                    <>
                        {' '}
                        · {group.branch.name}
                        {group.branch.city ? `, ${group.branch.city}` : ''}
                    </>
                )}
            </div>
        </>
    );
});
