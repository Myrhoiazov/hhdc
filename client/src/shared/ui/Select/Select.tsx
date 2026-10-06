import { ChangeEvent, useMemo } from 'react';
import cls from './Select.module.scss';
import { classNames, Mods } from '@/shared/lib/classNames/classNames';

export interface SelectOption<T extends string> {
    value: T;
    content: string;
}

interface SelectProps<T extends string> {
    className?: string;
    label?: string;
    options?: SelectOption<T>[];
    value?: T;
    onChange?: (value: T) => void;
    readonly?: boolean;
    defaultValue?: string;
}

export const Select = <T extends string>(props: SelectProps<T>) => {
    const { className, label, options, onChange, value, readonly, defaultValue } = props;

    const onChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => {
        if (onChange) {
            onChange(e.target.value as T);
        }
    };

    const optionsList = useMemo(() => {
        const defaultOption = defaultValue ? (
            <option
                key="default"
                className={cls.option}
                value=""
                disabled={value ? true : false}
                hidden={value ? true : false}
            >
                {defaultValue}
            </option>
        ) : null;

        const regularOptions =
            options?.map((opt) => (
                <option className={cls.option} value={opt.value} key={opt.value}>
                    {opt.content}
                </option>
            )) ?? [];

        return [defaultOption, ...regularOptions];
    }, [options, defaultValue, value]);

    const mods: Mods = {};

    return (
        <div className={classNames(cls.Wrapper, mods, [className])}>
            {label && <span className={cls.label}>{label}</span>}
            <select
                disabled={readonly}
                className={cls.select}
                value={value}
                onChange={onChangeHandler}
            >
                {optionsList}
            </select>
        </div>
    );
};
