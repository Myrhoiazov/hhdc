import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import s from './ScheduleSettingsPage.module.scss';
import { useScheduleSettingsPage } from './useScheduleSettingsPage';
import { GroupStatisticsSection } from './GroupStatisticsSection';
import { GroupsListSection } from './GroupsListSection';
import { ScheduleToolbar } from './ScheduleToolbar';
import { CreateGroupModal } from '../CreateGroupModal/CreateGroupModal';

const ScheduleSettingsPage = memo(() => {
    const { t } = useTranslation();
    const p = useScheduleSettingsPage();

    return (
        <Page>
            <h1 className={s.pageTitle}>{t('Управление группами')}</h1>
            <ScheduleToolbar onCreate={() => p.setCreateOpen(true)} />
            {p.statistics && (
                <GroupStatisticsSection
                    statistics={p.statistics}
                    getBranchView={p.getBranchView}
                    setBranchViewMode={p.setBranchViewMode}
                    openBranches={p.openBranches}
                    onToggleBranch={p.onToggleBranch}
                    highlightedGroupId={p.highlightedGroupId}
                    groupCardRefs={p.groupCardRefs}
                />
            )}
            <GroupsListSection
                groups={p.groups}
                total={p.total}
                loading={p.loading}
                statistics={p.statistics}
                styles={p.styles}
                choreographers={p.choreographers}
                filterStyle={p.filterStyle}
                setFilterStyle={p.setFilterStyle}
                filterChoreographer={p.filterChoreographer}
                setFilterChoreographer={p.setFilterChoreographer}
                filterLevel={p.filterLevel}
                setFilterLevel={p.setFilterLevel}
                onReset={p.onReset}
                onEdit={p.onEdit}
                onDeleteGroup={p.onDeleteGroup}
            />
            <CreateGroupModal
                isOpen={p.createOpen}
                onClose={p.onCloseCreate}
                onSaved={p.onSaved}
                editGroup={p.editGroup}
            />
        </Page>
    );
});

export default ScheduleSettingsPage;
