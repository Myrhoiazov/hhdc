import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Text.module.scss';
import { memo } from 'react';

export type TextVariant = 'primary' | 'error' | 'accent';

export type TextAlign = 'right' | 'left' | 'center';

export type TextSize = 'xs' | 's' | 'm' | 'l';

interface TextProps {
    className?: string;
    title?: string;
    text?: string;
    variant?: TextVariant;
    align?: TextAlign;
    size?: TextSize;
    bold?: boolean;
    'data-testid'?: string;
}

type HeaderTagType = 'h1' | 'h2' | 'h3' | 'h4';

const mapSizeToClass: Record<TextSize, string> = {
    xs: cls.size_xs,
    s: cls.size_s,
    m: cls.size_m,
    l: cls.size_l,
};

const mapSizeToHeaderTag: Record<TextSize, HeaderTagType> = {
    xs: 'h4',
    s: 'h3',
    m: 'h2',
    l: 'h1',
};

export const Text = memo((props: TextProps) => {
    const {
        className,
        text,
        title,
        variant = 'primary',
        align = 'left',
        size = 'm',
        bold,
        'data-testid': dataTestId = 'Text',
    } = props;

    const HeaderTag = mapSizeToHeaderTag[size];
    const sizeClass = mapSizeToClass[size];

    const additionalClasses = [cls[variant], cls[align], sizeClass, className];

    return (
        <div className={classNames(cls.Text, { [cls.bold]: bold }, additionalClasses)}>
            {title && (
                <HeaderTag
                    className={classNames(cls.title, {}, [className])}
                    data-testid={`${dataTestId}.Header`}
                >
                    {title}
                </HeaderTag>
            )}
            {text && (
                <p className={cls.text} data-testid={`${dataTestId}.Paragraph`}>
                    {text}
                </p>
            )}
        </div>
    );
});
