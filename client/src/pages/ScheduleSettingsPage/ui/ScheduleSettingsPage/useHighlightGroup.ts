import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GroupManagementStatistics } from '@/entities/DanceGroup';
import { BranchViewMode } from './useBranchView';

export const useHighlightGroup = (
    statistics: GroupManagementStatistics | null,
    branchView: Record<number, BranchViewMode>,
    setBranchView: Dispatch<SetStateAction<Record<number, BranchViewMode>>>,
    openBranches: Set<number>,
    setOpenBranches: Dispatch<SetStateAction<Set<number>>>,
) => {
    const [searchParams] = useSearchParams();
    const highlightGroupId = searchParams.get('highlight');
    const [highlightedGroupId, setHighlightedGroupId] = useState<number | null>(null);
    const groupCardRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!highlightGroupId || !statistics) return;

        const targetId = Number(highlightGroupId);
        const targetGroup = statistics.groups.find((group) => group.id === targetId);
        if (!targetGroup || targetGroup.branchId === null) return;

        const branchId = targetGroup.branchId;
        setBranchView((prev) => ({ ...prev, [branchId]: 'groups' }));
        setOpenBranches((prev) => new Set(prev).add(branchId));
        setHighlightedGroupId(targetId);
    }, [highlightGroupId, statistics, setBranchView, setOpenBranches]);

    useEffect(() => {
        if (!highlightedGroupId) return undefined;

        const node = groupCardRefs.current[highlightedGroupId];
        if (!node) return undefined;

        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timeout = setTimeout(() => setHighlightedGroupId(null), 4000);
        return () => clearTimeout(timeout);
    }, [highlightedGroupId, branchView, openBranches]);

    return { highlightedGroupId, groupCardRefs };
};
