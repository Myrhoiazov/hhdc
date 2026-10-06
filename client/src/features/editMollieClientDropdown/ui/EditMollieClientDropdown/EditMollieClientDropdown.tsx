import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { MollieClientFormModal } from '../MollieClientFormModal/MollieClientFormModal';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientReducer } from '../../model/slices/mollieClientSlice';
import { useEditMollieClientDropdown } from './useEditMollieClientDropdown';

interface EditClientDropdownProps {
    className?: string;
    clientId: string;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    mollieClientForm: mollieClientReducer,
};

export const EditMollieClientDropdown = memo((props: EditClientDropdownProps) => {
    const { className, clientId, reloadPage } = props;
    const { isModalOpen, items, setIsModalCloseHandle } = useEditMollieClientDropdown(clientId, reloadPage);

    return (
        <>
            <Dropdown
                direction="bottom left"
                className={classNames('', {}, [className])}
                items={items}
                trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />}
            />
            <DynamicModuleLoader reducers={initialReducers}>
                <MollieClientFormModal
                    clientId={clientId}
                    isOpen={isModalOpen}
                    onClose={setIsModalCloseHandle}
                    reloadPage={reloadPage}
                />
            </DynamicModuleLoader>
        </>
    );
});
