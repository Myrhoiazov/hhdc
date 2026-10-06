import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useCallback } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { deleteTransactionById } from '../../model/services/deleteTransactionById';
import { toast } from 'react-toastify';

interface EditTransactionDropdownProps {
    className?: string;
    transactionId: string;
    reloadPage?: () => void;
}

export const EditTransactionDropdown = memo((props: EditTransactionDropdownProps) => {
    const { className, transactionId, reloadPage } = props;

    const dispatch = useAppDispatch();

    const deleteTransactionHandler = useCallback(async () => {
        const result = await dispatch(deleteTransactionById(transactionId));
        if (result.meta.requestStatus === 'fulfilled') {
            reloadPage?.();
            toast.info('Транзакция успешно удалена');
        }
    }, [dispatch]);

    const items = [
        {
            content: 'Удалить',
            onClick: deleteTransactionHandler,
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
