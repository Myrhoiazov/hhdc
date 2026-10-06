import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupLevel } from '@/entities/DanceGroup';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './CreateGroupModal.module.scss';

interface SelectFieldProps {
    label: string;
    required?: boolean;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    children: ReactNode;
}

export const SelectField = memo(function SelectField({
    label,
    required,
    value,
    onChange,
    placeholder,
    children,
}: SelectFieldProps) {
    const { t } = useTranslation();
    return (
        <div className={s.field}>
            <label className={s.label}>
                {t(label)} {required && <span className={s.req}>*</span>}
            </label>
            <select className={s.select} value={value} onChange={(e) => onChange(e.target.value)}>
                {placeholder && <option value="">{t(placeholder)}</option>}
                {children}
            </select>
        </div>
    );
});

interface NumberFieldProps {
    label: string;
    value: string | number;
    min?: number;
    step?: string;
    onChange: (value: string) => void;
}

export const NumberField = memo(function NumberField({ label, value, min, step, onChange }: NumberFieldProps) {
    const { t } = useTranslation();
    return (
        <div className={s.field}>
            <label className={s.label}>{t(label)}</label>
            <input
                className={s.inputSmall}
                type="number"
                min={min}
                step={step}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
});

interface LevelButtonsProps {
    levels: { value: GroupLevel; label: string }[];
    level: GroupLevel;
    setLevel: (level: GroupLevel) => void;
}

export const LevelButtons = memo(function LevelButtons({ levels, level, setLevel }: LevelButtonsProps) {
    return (
        <div className={s.levelGroup}>
            {levels.map((l) => (
                <button
                    key={l.value}
                    type="button"
                    className={classNames(s.levelBtn, { [s.levelActive]: level === l.value })}
                    onClick={() => setLevel(l.value)}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
});
