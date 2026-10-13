import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Field.module.scss';

interface FieldProps {
    // The i18n key of the caption above the control.
    label: string;
    children: ReactNode;
    className?: string;
}

// A captioned form control: the caption and the `input`, `select` or `textarea` given as children.
export const Field = memo(({ label, children, className }: FieldProps) => {
    const { t } = useTranslation();
    return (
        <label className={classNames(cls.Field, {}, [className])}>
            <span>{t(label)}</span>
            {children}
        </label>
    );
});
