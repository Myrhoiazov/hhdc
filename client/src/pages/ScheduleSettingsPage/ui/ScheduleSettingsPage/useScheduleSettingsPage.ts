import { useGroupFilters } from './useGroupFilters';
import { useGroupsData } from './useGroupsData';
import { useGroupReferenceLists } from './useGroupReferenceLists';
import { useGroupModal } from './useGroupModal';
import { useBranchView } from './useBranchView';
import { useHighlightGroup } from './useHighlightGroup';

export type { BranchViewMode } from './useBranchView';

export const useScheduleSettingsPage = () => {
    const filters = useGroupFilters();
    const {
        groups, total, loading, statistics, onDeleteGroup, onSaved: onGroupsSaved,
    } = useGroupsData(filters.filterStyle, filters.filterChoreographer, filters.filterLevel);
    const referenceLists = useGroupReferenceLists();
    const modal = useGroupModal();
    const branchView = useBranchView();
    const { highlightedGroupId, groupCardRefs } = useHighlightGroup(
        statistics, branchView.branchView, branchView.setBranchView, branchView.openBranches, branchView.setOpenBranches,
    );

    return {
        groups,
        total,
        loading,
        statistics,
        ...referenceLists,
        ...filters,
        ...modal,
        branchView: branchView.branchView,
        getBranchView: branchView.getBranchView,
        setBranchViewMode: branchView.setBranchViewMode,
        openBranches: branchView.openBranches,
        onToggleBranch: branchView.onToggleBranch,
        highlightedGroupId,
        groupCardRefs,
        onDeleteGroup,
        onSaved: onGroupsSaved,
    };
};
