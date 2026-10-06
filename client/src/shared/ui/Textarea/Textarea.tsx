import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { useAutofocus } from '@/shared/lib/hooks/useAutofocus/useAutofocus';
import React, { memo, TextareaHTMLAttributes } from 'react';
import cls from './Textarea.module.scss';

type HTMLTextAreaProps = Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'onChange' | 'readOnly' | 'size'
>;

type TextAreaSize = 's' | 'm' | 'l';

interface TextareaProps extends HTMLTextAreaProps {
    className?: string;
    value?: string;
    label?: string;
    onChange?: (value: string) => void;
    autofocus?: boolean;
    readonly?: boolean;
    size?: TextAreaSize;
    fullWidth?: boolean;
}

const buildMods = (isFocused: boolean, readonly?: boolean, fullWidth?: boolean): Mods => ({
    [cls.readonly]: readonly,
    [cls.focused]: isFocused,
    [cls.fullWidth]: fullWidth,
});

const Textarea = (props: TextareaProps) => {
    const {
        className,
        readonly,
        value,
        fullWidth,
        onChange,
        name,
        placeholder,
        autofocus,
        ...otherProps
    } = props;
    const { ref, isFocused, onBlur, onFocus } = useAutofocus<HTMLTextAreaElement>(autofocus);

    const onChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
    };

    const mods = buildMods(isFocused, readonly, fullWidth);

    return (
        <div className={classNames(cls.Textarea, mods, [className])}>
            {placeholder && (
                <label htmlFor={placeholder} className={cls.placeholder}>{`${placeholder}`}</label>
            )}
            <textarea
                name={name}
                id={placeholder}
                ref={ref}
                value={value}
                onChange={onChangeHandler}
                className={cls.input}
                onFocus={onFocus}
                onBlur={onBlur}
                {...otherProps}
            />
        </div>
    );
};

export default memo(Textarea);