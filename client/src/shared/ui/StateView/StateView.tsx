import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './StateView.module.scss';

type StateViewVariant = 'page' | 'card' | 'inline';
type StateViewTone = 'neutral' | 'loading' | 'error' | 'success';

interface StateViewProps {
    className?: string;
    title?: string;
    text?: string;
    action?: ReactNode;
    icon?: ReactNode;
    variant?: StateViewVariant;
    tone?: StateViewTone;
}

export const StateView = memo((props: StateViewProps) => {
    const {
        className,
        title,
        text,
        action,
        icon,
        variant = 'card',
        tone = 'neutral',
    } = props;

    return (
        <div className={classNames(cls.StateView, {}, [className, cls[variant], cls[tone]])}>
            <div className={cls.icon} aria-hidden="true">
                {icon || (tone === 'loading' ? <span className={cls.dots}><i /><i /><i /></span> : '·')}
            </div>
            <div className={cls.content}>
                {title && <div className={cls.title}>{title}</div>}
                {text && <div className={cls.text}>{text}</div>}
                {action && <div className={cls.action}>{action}</div>}
            </div>
        </div>
    );
});
