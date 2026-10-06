import { useCallback, useState, type SyntheticEvent } from 'react';

export type BranchViewMode = 'flat' | 'groups';

export const useBranchView = () => {
    const [branchView, setBranchView] = useState<Record<number, BranchViewMode>>({});
    const [openBranches, setOpenBranches] = useState<Set<number>>(new Set());

    const getBranchView = useCallback((branchId: number) => branchView[branchId] ?? 'flat', [branchView]);
    const setBranchViewMode = useCallback((branchId: number, mode: BranchViewMode) => {
        setBranchView((prev) => ({ ...prev, [branchId]: mode }));
    }, []);

    const onToggleBranch = useCallback((branchId: number) => (event: SyntheticEvent<HTMLDetailsElement>) => {
        const isOpen = event.currentTarget.open;
        setOpenBranches((prev) => {
            const next = new Set(prev);
            if (isOpen) next.add(branchId); else next.delete(branchId);
            return next;
        });
    }, []);

    return {
        branchView, setBranchView, getBranchView, setBranchViewMode, openBranches, setOpenBranches, onToggleBranch,
    };
};
