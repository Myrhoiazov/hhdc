import { ComponentPropsWithoutRef, memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Badge.module.scss';

export type BadgeTone = 'success' | 'danger';

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
    // Green for what went well, red for what failed; neutral when left out.
    tone?: BadgeTone;
}

// A short label as a pill: a status, a role, a category.
export const Badge = memo(({ tone, className, ...rest }: BadgeProps) => (
    <span {...rest} className={classNames(cls.Badge, {}, [tone && cls[tone], className])} />
));
