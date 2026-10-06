import { Checkbox } from '@headlessui/react';
import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './CheckBox.module.scss';
import { HStack } from '../Stack';
import { Text } from '../Text/Text';
import CheckIcon from '@/shared/assets/icons/check.svg';
import { Icon } from '../Icon/Icon';

interface CheckBoxProps {
    className?: string;
    label?: string;
    value: boolean;
    onChange?: (checked: boolean) => void;
}

const CheckBox = ({ className, value, label, onChange }: CheckBoxProps) => {
    const onChangeHandler = (checked: boolean) => {
        onChange?.(checked);
    };

    const checkbox = (
        <Checkbox
            checked={value}
            onChange={onChangeHandler}
            className={classNames(s.CheckBox, {}, [className])}
        >
            {value && <Icon Svg={CheckIcon} width={26} color="stroke" />}
        </Checkbox>
    );

    if (label) {
        return (
            <HStack max gap="16">
                <Text text={label} />
                {checkbox}
            </HStack>
        );
    }

    return checkbox;
};

export default memo(CheckBox);
