import { Fragment, ReactNode, useMemo } from 'react';
import { ListboxButton, ListboxOption, ListboxOptions, Listbox } from '@headlessui/react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { DropdownDirection } from '@/shared/types/ui';
import { Button } from '../../../Button/Button';
import cls from './ListBox.module.scss';
import { mapDirectionClass } from '../../styles/consts';
import popupCls from '../../styles/popup.module.scss';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';

export interface ListBoxItem<T extends string> {
    value: T;
    content: ReactNode;
    disabled?: boolean;
}

interface ListBoxProps<T extends string> {
    items?: ListBoxItem<T>[];
    className?: string;
    value?: T;
    defaultValue?: string;
    onChange: (value: T) => void;
    readonly?: boolean;
    direction?: DropdownDirection;
    label?: string;
}

export function ListBox<T extends string>(props: ListBoxProps<T>) {
    const {
        className,
        items,
        value,
        defaultValue,
        onChange,
        readonly,
        direction = 'bottom right',
        label,
    } = props;

    const optionsClasses = [mapDirectionClass[direction], popupCls.menu];

    const selectedItem = useMemo(() => {
        return items?.find((item) => item.value === value);
    }, [items, value]);

    return (
        <VStack gap="4" max align="start">
            {label && <Text text={label} />}
            <Listbox
                disabled={readonly}
                as="div"
                className={classNames(cls.ListBox, {}, [className, popupCls.popup])}
                value={value}
                onChange={onChange}
            >
                <ListboxButton as={Button} value="filled" disabled={readonly}>
                    {selectedItem?.content ?? defaultValue}
                </ListboxButton>
                <ListboxOptions className={classNames(cls.options, {}, optionsClasses)}>
                    {items?.map((item) => (
                        <ListBoxOptionItem key={item.value} item={item} />
                    ))}
                </ListboxOptions>
            </Listbox>
        </VStack>
    );
}

function ListBoxOptionItem<T extends string>({ item }: { item: ListBoxItem<T> }) {
    return (
        <ListboxOption
            value={item.value}
            disabled={item.disabled}
            as={Fragment}
        >
            {({ active, selected }) => (
                <li
                    className={classNames(cls.item, {
                        [popupCls.active]: active,
                        [popupCls.disabled]: item.disabled,
                        [popupCls.selected]: selected,
                    })}
                >
                    {selected}
                    {item.content}
                </li>
            )}
        </ListboxOption>
    );
}
