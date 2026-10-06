import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useCallback } from 'react';
import { getRouteProfile } from '@/shared/const/router';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { deleteUserById } from '../../model/services/deleteUserById';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';

interface EditUserDropdownProps {
    className?: string;
    userId: string;
    isEnabled: boolean;
    reloadPage?: () => void;
}

export const EditUserDropdown = memo((props: EditUserDropdownProps) => {
    const { className, userId, isEnabled, reloadPage } = props;

    const dispatch = useAppDispatch();

    const deleteClientGandler = useCallback(async () => {
        const result = await dispatch(deleteUserById(userId));
        if (result.meta.requestStatus === 'fulfilled') {
            reloadPage?.();
            toast.info('Пользователь успешно удален');
        }
    }, [dispatch]);

    const toggleAccount = useCallback(async () => {
        try {
            await $apiPrivate.patch(`/users/${userId}`, { isEnabled: !isEnabled });
            toast.success(isEnabled ? 'Аккаунт заблокирован' : 'Аккаунт разблокирован');
            reloadPage?.();
        } catch {
            toast.error('Не удалось изменить статус аккаунта');
        }
    }, [isEnabled, reloadPage, userId]);

    const items = [
        {
            content: 'Редактировать',
            href: getRouteProfile(String(userId)),
        },
        {
            content: isEnabled ? 'Заблокировать вход' : 'Разблокировать вход',
            onClick: toggleAccount,
        },
        {
            content: 'Удалить',
            onClick: deleteClientGandler,
        },
    ];

    return (
        <Dropdown
            direction="bottom left"
            className={classNames('', {}, [className])}
            items={items}
            trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />}
        />
    );
});
