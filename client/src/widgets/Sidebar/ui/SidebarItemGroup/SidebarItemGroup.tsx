import { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarItemType } from '../../model/types/sidebar';
import { SidebarItemGroupCollapsed } from './SidebarItemGroupCollapsed';
import { SidebarItemGroupExpanded } from './SidebarItemGroupExpanded';

interface SidebarItemGroupProps {
    item: SidebarItemType;
    collapsed: boolean;
    isOpen: boolean;
    onToggle: (key: string) => void;
}

export const SidebarItemGroup = memo(({ item, collapsed, isOpen, onToggle }: SidebarItemGroupProps) => {
    const { pathname } = useLocation();

    const isChildActive = item.children?.some(
        (child) => pathname === child.path || pathname.startsWith(child.path + '/'),
    ) ?? false;

    if (collapsed) {
        return <SidebarItemGroupCollapsed item={item} isChildActive={isChildActive} />;
    }

    return (
        <SidebarItemGroupExpanded
            item={item}
            isOpen={isOpen}
            isChildActive={isChildActive}
            onToggle={onToggle}
        />
    );
});