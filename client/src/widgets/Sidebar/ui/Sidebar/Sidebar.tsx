import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonSize, ButtonTheme } from '@/shared/ui/Button';
import { LangSwitcher } from '@/shared/ui/LangSwitcher';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import { SidebarItemGroup } from '../SidebarItemGroup/SidebarItemGroup';
import cls from './Sidebar.module.scss';
import { SidebarItemType } from '../../model/types/sidebar';
import { useSidebarState } from './useSidebarState';

interface SidebarProps {
    className?: string;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

const SidebarItemsSection = ({ title, items, collapsed, openGroup, onGroupToggle }: {
    title?: string;
    items: SidebarItemType[];
    collapsed: boolean;
    openGroup: string | null;
    onGroupToggle: (text: string) => void;
}) => (
    <>
        {!collapsed && title && <div className={cls.sectionTitle}>{title}</div>}
        {items.map((item) =>
            item.children?.length ? (
                <SidebarItemGroup
                    item={item}
                    key={item.text}
                    collapsed={collapsed}
                    isOpen={openGroup === item.text}
                    onToggle={onGroupToggle}
                />
            ) : (
                <SidebarItem item={item} key={item.text} collapsed={collapsed} />
            ),
        )}
    </>
);

export const Sidebar = memo(({ className, mobileOpen, onMobileClose }: SidebarProps) => {
    const { t } = useTranslation();
    const { collapsed, openGroup, mainItems, crmItems, onToggle, onGroupToggle } = useSidebarState({
        onMobileClose,
    });

    return (
        <>
            {/* Mobile overlay backdrop */}
            {mobileOpen && (
                <div className={cls.backdrop} onClick={onMobileClose} />
            )}

            <div
                data-testid="sidebar"
                className={classNames(cls.Sidebar, { [cls.collapsed]: collapsed, [cls.mobileOpen]: !!mobileOpen }, [className])}
            >
                {/* Mobile close button */}
                <button className={cls.mobileClose} onClick={onMobileClose} aria-label="Закрыть">
                    {t('✕')}
                </button>

                <Button
                    data-testid="sidebar-toggle" onClick={onToggle} className={cls.collapseBtn}
                    theme={ButtonTheme.BACKGROUND_INVERTED} size={ButtonSize.L} square
                >
                    {collapsed ? '›' : '‹'}
                </Button>

                <div className={cls.items}>
                    <SidebarItemsSection
                        title={t('Навигация')} items={mainItems} collapsed={collapsed}
                        openGroup={openGroup} onGroupToggle={onGroupToggle}
                    />
                    <SidebarItemsSection
                        title={t('CRM разделы')} items={crmItems} collapsed={collapsed}
                        openGroup={openGroup} onGroupToggle={onGroupToggle}
                    />
                </div>

                {/* Mobile-only footer: the navbar hides its language switcher at this width */}
                <div className={cls.footer} data-testid="sidebar-footer">
                    <LangSwitcher />
                </div>
            </div>
        </>
    );
});
