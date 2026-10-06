import { useCallback, useEffect, useMemo, useState } from 'react';
import { SidebarItemType } from '../../model/types/sidebar';

// Whichever group currently contains the active route should be open by default,
// and opening it should close any other group (accordion behavior).
export const useActiveSidebarGroup = (sidebarItemsList: SidebarItemType[] | undefined, pathname: string) => {
    const [openGroup, setOpenGroup] = useState<string | null>(null);

    const activeGroupKey = useMemo(() => {
        const groups = sidebarItemsList ?? [];
        const active = groups.find((item) => item.children?.some(
            (child) => pathname === child.path || pathname.startsWith(child.path + '/'),
        ));
        return active?.text ?? null;
    }, [sidebarItemsList, pathname]);

    useEffect(() => {
        if (activeGroupKey) {
            setOpenGroup(activeGroupKey);
        }
    }, [activeGroupKey]);

    const onGroupToggle = useCallback((key: string) => {
        setOpenGroup((prev) => (prev === key ? null : key));
    }, []);

    return { openGroup, onGroupToggle };
};
