import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DanceGroup, GroupStatistics } from '@/entities/DanceGroup';
import { GroupLevel } from '@/entities/DanceGroup';
import { classNames } from '@/shared/lib/classNames/classNames';
import { GroupCardMeta } from './GroupCardMeta';
import { GroupCardStudents } from './GroupCardStudents';
import s from './GroupCard.module.scss';

interface GroupCardProps {
    group: DanceGroup;
    statistics?: GroupStatistics;
    onEdit: (group: DanceGroup) => void;
    onDelete: (id: number) => void;
}

const levelLabel: Record<GroupLevel, string> = {
    START: 'Start',
    FAN: 'Fan',
    PRO: 'Pro',
};

export const GroupCard = memo(function GroupCard({ group, statistics, onEdit, onDelete }: GroupCardProps) {
    const { t } = useTranslation();

    return (
        <div className={s.card}>
            <div className={s.main}>
                <div className={s.titleRow}>
                    <span className={s.name}>{group.name}</span>
                    <span
                        className={classNames(s.badge, {}, [
                            s[`level_${group.level.toLowerCase()}`],
                        ])}
                    >
                        {levelLabel[group.level]}
                    </span>
                </div>
                <GroupCardMeta group={group} statistics={statistics} />
                <GroupCardStudents statistics={statistics} />
            </div>
            <div className={s.actions}>
                <button className={s.editBtn} onClick={() => onEdit(group)} title="Редактировать">
                    {t('✎')}
                </button>
                <button className={s.deleteBtn} onClick={() => onDelete(group.id)} title="Удалить">
                    🗑
                </button>
            </div>
        </div>
    );
});
