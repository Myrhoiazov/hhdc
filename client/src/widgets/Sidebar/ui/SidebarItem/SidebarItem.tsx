import { AppLink, AppLinkTheme } from '@/shared/ui/AppLink/AppLink';
import cls from './SidebarItem.module.scss';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { useSelector } from 'react-redux';
import { getUserAuthData } from '@/entities/User';
import { SidebarItemType } from '@/widgets/Sidebar/model/types/sidebar';
import { Icon } from '@/shared/ui/Icon/Icon';
import { useLocation } from 'react-router-dom';

interface SidebarItemProps {
    item: SidebarItemType;
    collapsed: boolean;
    nested?: boolean;
}

export const SidebarItem = memo(({ item, collapsed, nested }: SidebarItemProps) => {
    const { t } = useTranslation();
    const isAuth = useSelector(getUserAuthData);
    const { pathname } = useLocation();

    if (item.authOnly && !isAuth) {
        return null;
    }

    const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

    return (
        <AppLink
            theme={AppLinkTheme.SECONDARY}
            to={item.path}
            className={classNames(cls.item, { [cls.collapsed]: collapsed, [cls.active]: isActive, [cls.nested]: nested })}
        >
            <Icon
                Svg={item.Icon}
                width={20}
                height={20}
                className={classNames(cls.icon, {}, [item.iconColor === 'stroke' ? cls.iconStroke : cls.iconFill])}
                color={item.iconColor ?? 'fill'}
            />
            <span className={cls.link}>{t(item.text)}</span>
            {!collapsed && <span className={cls.chevron}>›</span>}
        </AppLink>
    );
});
