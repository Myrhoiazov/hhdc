import React, { InputHTMLAttributes, memo, ReactNode } from 'react';
import cls from './Input.module.scss';
import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { useAutofocus } from '@/shared/lib/hooks/useAutofocus/useAutofocus';
import { VStack } from '../Stack';
import { Text } from '../Text/Text';

type HTMLInputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'readOnly' | 'size'
>;

type InputSize = 's' | 'm' | 'l';

type BaseInputProps = {
    className?: string;
    label?: string;
    autofocus?: boolean;
    readonly?: boolean;
    addonLeft?: ReactNode;
    addonRight?: ReactNode;
    size?: InputSize;
    fullWidth?: boolean;
} & HTMLInputProps;

type TextInputProps = BaseInputProps & {
    type?: 'text' | 'email' | 'date' | 'number' | 'tel' | 'password';
    value?: string | number;
    onChange?: (value: string) => void;
};

type FileInputProps = BaseInputProps & {
    type: 'file';
    value?: never;
    onChange?: (value: File | File[]) => void;
};

export type InputProps = TextInputProps | FileInputProps;

const handleFileChange = (files: FileList | null, onChange?: (value: File | File[]) => void) => {
    if (files?.length === 1) {
        onChange?.(files[0]);
    } else if (files?.length && files.length > 1) {
        onChange?.(Array.from(files));
    }
};

const buildMods = (isFocused: boolean, readonly?: boolean, fullWidth?: boolean, addonLeft?: ReactNode, addonRight?: ReactNode): Mods => ({
    [cls.readonly]: readonly,
    [cls.focused]: isFocused,
    [cls.fullWidth]: fullWidth,
    [cls.withAddonLeft]: Boolean(addonLeft),
    [cls.withAddonRight]: Boolean(addonRight),
});

interface InputControlProps {
    inputRef: React.RefObject<HTMLInputElement | null>;
    className?: string;
    size: InputSize;
    type: string;
    value?: string | number;
    placeholder?: string;
    readonly?: boolean;
    mods: Mods;
    addonLeft?: ReactNode;
    addonRight?: ReactNode;
    onChangeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
    otherProps: HTMLInputProps;
}

const InputControl = memo((props: InputControlProps) => {
    const {
        inputRef,
        className,
        size,
        type,
        value,
        placeholder,
        readonly,
        mods,
        addonLeft,
        addonRight,
        onChangeHandler,
        onFocus,
        onBlur,
        otherProps,
    } = props;

    return (
        <div className={classNames(cls.InputWrapper, mods, [className, cls[size]])}>
            <div className={cls.addonLeft}>{addonLeft}</div>
            <input
                ref={inputRef}
                type={type}
                value={value}
                onChange={onChangeHandler}
                className={cls.input}
                onFocus={onFocus}
                onBlur={onBlur}
                readOnly={readonly}
                placeholder={placeholder}
                {...otherProps}
            />
            <div className={cls.addonRight}>{addonRight}</div>
        </div>
    );
});

const createChangeHandler = (type: string, onChange: InputProps['onChange']) => (
    e: React.ChangeEvent<HTMLInputElement>
) => {
    if (type === 'file') {
        handleFileChange(e.target.files, onChange as (value: File | File[]) => void);
    } else {
        (onChange as (value: string | number) => void)?.(e.target.value);
    }
};

export const Input = memo((props: InputProps) => {
    const {
        className,
        value,
        onChange,
        type = 'text',
        placeholder,
        autofocus,
        readonly,
        fullWidth,
        addonLeft,
        addonRight,
        label,
        size = 'm',
        ...otherProps
    } = props;
    const { ref, isFocused, onBlur, onFocus } = useAutofocus<HTMLInputElement>(autofocus);
    const onChangeHandler = createChangeHandler(type, onChange);
    const mods = buildMods(isFocused, readonly, fullWidth, addonLeft, addonRight);

    const input = (
        <InputControl
            inputRef={ref}
            className={className}
            size={size}
            type={type}
            value={value}
            placeholder={placeholder}
            readonly={readonly}
            mods={mods}
            addonLeft={addonLeft}
            addonRight={addonRight}
            otherProps={{ 'aria-label': label, ...otherProps }}
            onChangeHandler={onChangeHandler}
            onFocus={onFocus}
            onBlur={onBlur}
        />
    );

    if (label) {
        return (
            <VStack max gap="4">
                <Text text={label} />
                {input}
            </VStack>
        );
    }

    return input;
});
