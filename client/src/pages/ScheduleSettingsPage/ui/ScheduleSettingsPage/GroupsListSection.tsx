import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DanceGroup, Choreographer, GroupManagementStatistics } from '@/entities/DanceGroup';
import { GroupCard } from '../GroupCard/GroupCard';
import { GroupFilters } from './GroupFilters';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import s from './ScheduleSettingsPage.module.scss';

interface GroupsListSectionProps {
    groups: DanceGroup[];
    total: number;
    loading: boolean;
    statistics: GroupManagementStatistics | null;
    styles: string[];
    choreographers: Choreographer[];
    filterStyle: string;
    setFilterStyle: (value: string) => void;
    filterChoreographer: string;
    setFilterChoreographer: (value: string) => void;
    filterLevel: string;
    setFilterLevel: (value: string) => void;
    onReset: () => void;
    onEdit: (group: DanceGroup) => void;
    onDeleteGroup: (id: number) => void;
}

export const GroupsListSection = memo(function GroupsListSection(props: GroupsListSectionProps) {
    const { t } = useTranslation();
    const allTotal = props.groups.length;

    return (
        <div className={s.section}>
            <div className={s.sectionTitle}>
                {t('Группы ({{allTotal}}/{{total}})', { allTotal, total: props.total })}
            </div>

            <GroupFilters
                styles={props.styles}
                choreographers={props.choreographers}
                filterStyle={props.filterStyle}
                setFilterStyle={props.setFilterStyle}
                filterLevel={props.filterLevel}
                setFilterLevel={props.setFilterLevel}
                filterChoreographer={props.filterChoreographer}
                setFilterChoreographer={props.setFilterChoreographer}
                onReset={props.onReset}
            />

            {props.loading ? (
                <ListSkeleton rows={5} height={146} />
            ) : props.groups.length === 0 ? (
                <StateView
                    className={s.empty}
                    title="Группы не найдены"
                    text="Создайте первую группу и привяжите её к филиалу, чтобы ученики могли попадать в нужное расписание."
                />
            ) : (
                <div className={s.list}>
                    {props.groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            statistics={props.statistics?.groups.find((item) => item.id === group.id)}
                            onEdit={props.onEdit}
                            onDelete={props.onDeleteGroup}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});
