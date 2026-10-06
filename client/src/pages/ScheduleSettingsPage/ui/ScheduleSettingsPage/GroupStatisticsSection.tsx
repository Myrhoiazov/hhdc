import { memo, type RefObject, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getRouteClientDetails } from '@/shared/const/router';
import { classNames } from '@/shared/lib/classNames/classNames';
import { GroupManagementStatistics, GroupStudent } from '@/entities/DanceGroup';
import { BranchViewMode } from './useScheduleSettingsPage';
import s from './ScheduleSettingsPage.module.scss';

const studentName = (student: GroupStudent) => (
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || `Ученик #${student.id}`
);

const StudentLink = ({ student }: { student: GroupStudent }) => (
    <Link to={getRouteClientDetails(String(student.id))} className={s.studentLink}>
        {studentName(student)}
    </Link>
);

const StudentList = memo(({ label, students }: { label: string; students: GroupStudent[] }) => {
    const { t } = useTranslation();
    return (
        <div>
            <strong>{label}</strong>
            {students.length ? (
                <ul>
                    {students.map((student) => (
                        <li key={student.id}><StudentLink student={student} /></li>
                    ))}
                </ul>
            ) : <span>{t('Нет учеников')}</span>}
        </div>
    );
});

const StudentGroupCard = ({
    group,
    highlightedGroupId,
    groupCardRefs,
}: {
    group: GroupManagementStatistics['groups'][number];
    highlightedGroupId: number | null;
    groupCardRefs: RefObject<Record<number, HTMLDivElement | null>>;
}) => {
    const { t } = useTranslation();
    return (
        <div
            className={classNames(s.groupCard, {
                [s.groupCardHighlighted]: highlightedGroupId === group.id,
            }, [])}
            ref={(node) => { groupCardRefs.current[group.id] = node; }}
        >
            <div className={s.groupCardHeader}>
                <strong>{group.name}</strong>
                <span>{group.activeCount}{t(' активных · ')}{group.inactiveCount}{t(' неактивных')}</span>
            </div>
            <div className={s.branchStudents}>
                <StudentList label={t('Активные ({{count}})', { count: group.activeCount })} students={group.activeStudents} />
                <StudentList label={t('Неактивные ({{count}})', { count: group.inactiveCount })} students={group.inactiveStudents} />
            </div>
        </div>
    );
};

const BranchGroupsView = ({
    groups,
    branchId,
    highlightedGroupId,
    groupCardRefs,
}: {
    groups: GroupManagementStatistics['groups'];
    branchId: number;
    highlightedGroupId: number | null;
    groupCardRefs: RefObject<Record<number, HTMLDivElement | null>>;
}) => {
    const { t } = useTranslation();
    const branchGroups = groups.filter((group) => group.branchId === branchId);

    if (!branchGroups.length) {
        return <span>{t('В этом филиале нет групп')}</span>;
    }

    return (
        <>
            {branchGroups.map((group) => (
                <StudentGroupCard
                    key={group.id}
                    group={group}
                    highlightedGroupId={highlightedGroupId}
                    groupCardRefs={groupCardRefs}
                />
            ))}
        </>
    );
};

interface BranchCardProps {
    branch: GroupManagementStatistics['branches'][number];
    groups: GroupManagementStatistics['groups'];
    viewMode: BranchViewMode;
    onSetViewMode: (mode: BranchViewMode) => void;
    open: boolean;
    onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
    highlightedGroupId: number | null;
    groupCardRefs: RefObject<Record<number, HTMLDivElement | null>>;
}

const BranchViewToggle = ({ viewMode, onSetViewMode }: { viewMode: BranchViewMode; onSetViewMode: (mode: BranchViewMode) => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.viewToggle}>
            <button type="button" className={viewMode === 'flat' ? s.viewToggleActive : ''} onClick={() => onSetViewMode('flat')}>
                {t('Общий список')}
            </button>
            <button type="button" className={viewMode === 'groups' ? s.viewToggleActive : ''} onClick={() => onSetViewMode('groups')}>
                {t('По группам')}
            </button>
        </div>
    );
};

const BranchCard = ({
    branch, groups, viewMode, onSetViewMode, open, onToggle, highlightedGroupId, groupCardRefs,
}: BranchCardProps) => {
    const { t } = useTranslation();

    return (
        <details className={s.branchCard} open={open} onToggle={onToggle}>
            <summary>
                <span>
                    <strong>{branch.name}</strong>
                    <small>{[branch.city, branch.address].filter(Boolean).join(' · ')}</small>
                </span>
                <span className={s.branchNumbers}>
                    {branch.groupCount}{t(' гр. · ')}{branch.activeCount}{t(' активных · ')}{branch.inactiveCount}{t(' неактивных')}
                </span>
            </summary>
            <div className={s.branchDetails}>
                <span>{t('Вместимость групп: {{capacity}}', { capacity: branch.capacity })}</span>
                <span>{t('Без группы: {{count}}', { count: branch.unassignedCount })}</span>
            </div>

            <BranchViewToggle viewMode={viewMode} onSetViewMode={onSetViewMode} />

            {viewMode === 'flat' ? (
                <div className={s.branchStudents}>
                    <StudentList label={t('Активные ({{count}})', { count: branch.activeCount })} students={branch.activeStudents} />
                    <StudentList label={t('Неактивные ({{count}})', { count: branch.inactiveCount })} students={branch.inactiveStudents} />
                </div>
            ) : (
                <div className={s.branchGroups}>
                    <BranchGroupsView
                        groups={groups} branchId={branch.id}
                        highlightedGroupId={highlightedGroupId} groupCardRefs={groupCardRefs}
                    />
                </div>
            )}
        </details>
    );
};

interface GroupStatisticsSectionProps {
    statistics: GroupManagementStatistics;
    getBranchView: (branchId: number) => BranchViewMode;
    setBranchViewMode: (branchId: number, mode: BranchViewMode) => void;
    openBranches: Set<number>;
    onToggleBranch: (branchId: number) => (event: SyntheticEvent<HTMLDetailsElement>) => void;
    highlightedGroupId: number | null;
    groupCardRefs: RefObject<Record<number, HTMLDivElement | null>>;
}

export const GroupStatisticsSection = memo((props: GroupStatisticsSectionProps) => {
    const { t } = useTranslation();
    const {
        statistics, getBranchView, setBranchViewMode,
        openBranches, onToggleBranch, highlightedGroupId, groupCardRefs,
    } = props;

    return (
        <>
            <div className={s.summaryGrid}>
                <div className={s.summaryCard}><span>{t('Филиалы')}</span><strong>{statistics.totals.branchCount}</strong></div>
                <div className={s.summaryCard}><span>{t('Группы')}</span><strong>{statistics.totals.groupCount}</strong></div>
                <div className={s.summaryCard}><span>{t('Активные ученики')}</span><strong>{statistics.totals.activeCount}</strong></div>
                <div className={s.summaryCard}><span>{t('Неактивные ученики')}</span><strong>{statistics.totals.inactiveCount}</strong></div>
                <div className={s.summaryCard}><span>{t('Общая вместимость')}</span><strong>{statistics.totals.capacity}</strong></div>
            </div>

            <div className={s.branchSection}>
                <div className={s.sectionTitle}>{t('Статистика по филиалам')}</div>
                <div className={s.branchGrid}>
                    {statistics.branches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            groups={statistics.groups}
                            viewMode={getBranchView(branch.id)}
                            onSetViewMode={(mode) => setBranchViewMode(branch.id, mode)}
                            open={openBranches.has(branch.id)}
                            onToggle={onToggleBranch(branch.id)}
                            highlightedGroupId={highlightedGroupId}
                            groupCardRefs={groupCardRefs}
                        />
                    ))}
                </div>
            </div>
        </>
    );
});
