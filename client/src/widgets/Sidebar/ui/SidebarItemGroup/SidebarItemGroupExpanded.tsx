import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Icon } from '@/shared/ui/Icon/Icon';
import { SidebarItemType } from '../../model/types/sidebar';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import cls from './SidebarItemGroup.module.scss';

interface SidebarItemGroupExpandedProps {
    item: SidebarItemType;
    isOpen: boolean;
    isChildActive: boolean;
    onToggle: (key: string) => void;
}

export const SidebarItemGroupExpanded = memo((props: SidebarItemGroupExpandedProps) => {
    const { item, isOpen, isChildActive, onToggle } = props;

    return (
        <div className={cls.group}>
            <button
                className={classNames(cls.trigger, { [cls.active]: isChildActive, [cls.open]: isOpen })}
                onClick={() => onToggle(item.text)}
                type="button"
            >
                <Icon
                    Svg={item.Icon}
                    width={20}
                    height={20}
                    className={classNames(cls.icon, {}, [item.iconColor === 'stroke' ? cls.iconStroke : cls.iconFill])}
                    color={item.iconColor ?? 'fill'}
                />
                <span className={cls.label}>{item.text}</span>
                <span className={classNames(cls.arrow, { [cls.arrowOpen]: isOpen })}>›</span>
            </button>

            <div
                className={classNames(cls.childrenWrapper, { [cls.childrenOpen]: isOpen })}
                aria-hidden={!isOpen}
            >
                <div className={cls.children}>
                    {item.children?.map((child) => (
                        <SidebarItem
                            key={child.path}
                            item={child}
                            collapsed={false}
                            nested
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});