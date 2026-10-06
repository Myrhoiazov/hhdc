import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import ListIcon from '@/shared/assets/icons/list-24-24.svg';
import TiledIcon from '@/shared/assets/icons/tiled-24-24.svg';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import cls from './ClientViewSelector.module.scss';
import { ClientView } from '../../model/types/client';

interface ClientViewSelectorProps {
    className?: string;
    view: ClientView;
    onViewClick?: (view: ClientView) => void;
}

const viewTypes = [
    {
        view: ClientView.SMALL,
        icon: TiledIcon,
    },
    {
        view: ClientView.BIG,
        icon: ListIcon,
    },
];

export const ClientViewSelector = memo((props: ClientViewSelectorProps) => {
    const { className, view, onViewClick } = props;

    const onClick = (newView: ClientView) => () => {
        onViewClick?.(newView);
    };

    return (
        <div className={classNames(cls.ClientViewSelector, {}, [className])}>
            {viewTypes.map((viewType) => (
                <Button
                    theme={ButtonTheme.CLEAR}
                    onClick={onClick(viewType.view)}
                    key={viewType.view}
                    className={classNames(cls.viewButton, {
                        [cls.selected]: viewType.view === view,
                    })}
                    aria-label={viewType.view === ClientView.SMALL ? 'Плитка' : 'Список'}
                >
                    <Icon
                        Svg={viewType.icon}
                        className={classNames(cls.icon, {
                            [cls.notSelected]: viewType.view !== view,
                        })}
                    />
                </Button>
            ))}
        </div>
    );
});
