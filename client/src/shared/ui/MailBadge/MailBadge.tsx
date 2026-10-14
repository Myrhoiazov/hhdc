import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './MailBadge.module.scss';

export type MailBadgeTone = 'incoming' | 'sent' | 'client' | 'new' | 'opened' | 'review';

interface MailBadgeProps {
    tone: MailBadgeTone;
    children: ReactNode;
}

// The small outlined label of the mail: where a letter goes, whether it was read, who wrote it.
export const MailBadge = memo(({ tone, children }: MailBadgeProps) => (
    <span className={classNames(cls.MailBadge, {}, [cls[tone]])}>{children}</span>
));
