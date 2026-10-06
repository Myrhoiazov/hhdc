import { classNames } from '@/shared/lib/classNames/classNames';
import React, { memo } from 'react';
import cls from './Icon.module.scss';

type SvgProps = Omit<React.SVGProps<SVGSVGElement>, 'onClick'>;

export type Fill = 'fill' | 'stroke';

interface IconBaseProps extends SvgProps {
    className?: string;
    color?: Fill;
    Svg: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface NonClickableIconProps extends IconBaseProps {
    clickable?: false;
}

interface ClickableBaseProps extends IconBaseProps {
    clickable: true;
    onClick: () => void;
}

type IconProps = NonClickableIconProps | ClickableBaseProps;

export const Icon = memo((props: IconProps) => {
    const {
        className,
        Svg,
        width = 32,
        height = 32,
        clickable,
        color = 'fill',
        ...otherProps
    } = props;

    const classes = [className, cls[color]];

    const icon = (
        <Svg
            className={classNames(cls.Icon, {}, classes)}
            width={width}
            height={height}
            {...otherProps}
            onClick={undefined}
        />
    );

    if (clickable) {
        return (
            <button
                type="button"
                className={cls.button}
                onClick={props.onClick}
                style={{ height, width }}
            >
                {icon}
            </button>
        );
    }

    return icon;
});
