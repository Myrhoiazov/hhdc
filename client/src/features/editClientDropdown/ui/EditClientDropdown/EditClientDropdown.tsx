import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useCallback } from 'react';
import { getRouteClientDetails, getRouteMollieDetails } from '@/shared/const/router';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { deleteClientById } from '../../model/services/deleteClientById';
import { toast } from 'react-toastify';

interface EditClientDropdownProps {
    className?: string;
    clientId: string;
    mollieCustomerId?: number;
    reloadPage?: () => void;
}

export const EditClientDropdown = memo((props: EditClientDropdownProps) => {
    const { className, clientId, mollieCustomerId, reloadPage } = props;

    const dispatch = useAppDispatch();

    const deleteClientGandler = useCallback(async () => {
        const result = await dispatch(deleteClientById(clientId));
        if (result.meta.requestStatus === 'fulfilled') {
            reloadPage?.();
            toast.info('Клиент успешно удален');
        }
    }, [clientId, dispatch, reloadPage]);

    const items = [
        {
            content: 'Профиль ученика',
            href: getRouteClientDetails(String(clientId)),
        },
        {
            content: mollieCustomerId ? 'Mollie аккаунт' : 'Mollie аккаунт не привязан',
            href: mollieCustomerId ? getRouteMollieDetails(String(mollieCustomerId)) : undefined,
            disabled: !mollieCustomerId,
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
