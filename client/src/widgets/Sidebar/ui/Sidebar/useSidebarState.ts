import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getSidebarItems } from '../../model/selectors/getSidebarItems';
import { SidebarItemType } from '../../model/types/sidebar';
import { useTabletCollapse } from './useTabletCollapse';
import { useActiveSidebarGroup } from './useActiveSidebarGroup';

export interface UseSidebarStateOptions {
    onMobileClose?: () => void;
}

export const useSidebarState = ({ onMobileClose }: UseSidebarStateOptions) => {
    const sidebarItemsList = useSelector(getSidebarItems);
    const { pathname } = useLocation();

    // Close mobile sidebar on navigation
    useEffect(() => {
        onMobileClose?.();
    }, [pathname]);

    const { collapsed, onToggle } = useTabletCollapse();
    const { openGroup, onGroupToggle } = useActiveSidebarGroup(sidebarItemsList, pathname);

    const [mainItems, crmItems] = useMemo(
        () => [
            (sidebarItemsList ?? []).slice(0, 1),
            (sidebarItemsList ?? []).slice(1),
        ],
        [sidebarItemsList],
    );

    return {
        collapsed,
        openGroup,
        mainItems,
        crmItems,
        sidebarItemsList: sidebarItemsList as SidebarItemType[] | undefined,
        onToggle,
        onGroupToggle,
    };
};
