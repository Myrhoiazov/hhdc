import { memo, useCallback, useState } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientsDetailsPage.module.scss';
import { ClientDetails } from '@/entities/Client';
import { useParams } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { VStack } from '@/shared/ui/Stack';
import { clientDetailsCommentsReducer } from '../../model/slices/clientDetailsCommentsSlice';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { ClientDetailsComments } from '../ClientDetailsComments/ClientDetailsComments';
import HeaderDetails from '../HeaderDetails/HeaderDetails';
import { ClientPaymentBlock } from '../ClientPaymentBlock/ClientPaymentBlock';
import { ClientEmailBlock } from '../ClientEmailBlock/ClientEmailBlock';
import { EditClientModal } from '../EditClientModal/EditClientModal';

interface ClientsDetailsPageProps {
    className?: string;
}

const reducers: ReducersList = {
    clientDetailsComments: clientDetailsCommentsReducer,
};

const ClientsDetailsPage = ({ className }: ClientsDetailsPageProps) => {
    const { id } = useParams<{ id: string }>();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const openEditModal = useCallback(() => {
        setIsEditModalOpen(true);
    }, []);

    const closeEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditSuccess = useCallback(() => {
        setReloadKey((prev) => prev + 1);
    }, []);

    if (!id) {
        return null;
    }

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={classNames(s.ClientsDetailsPage, {}, [className])}>
                <VStack gap="16" max>
                    <HeaderDetails userId={id} onEdit={openEditModal} />
                    <ClientDetails id={id} reloadKey={reloadKey} />
                    <ClientPaymentBlock id={id} />
                    <ClientEmailBlock id={id} />
                    <ClientDetailsComments id={id} />
                </VStack>
                <EditClientModal
                    clientId={id}
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    onSuccess={onEditSuccess}
                />
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(ClientsDetailsPage);
