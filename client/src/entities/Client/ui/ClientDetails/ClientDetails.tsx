import { memo, useEffect } from 'react';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { clientDetailsReducer } from '../../model/slice/clientDetailsSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { fetchClientById } from '../../model/services/fetchClientById/fetchClientById';
import { useSelector } from 'react-redux';
import {
    getClientDetailsData,
    getClientDetailsError,
    getClientDetailsIsLoading,
} from '../../model/selectors/clientDetails';
import { AppImage } from '@/shared/ui/AppImage';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './ClientDetails.module.scss';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClientDetailRow } from './ClientDetailRow';

interface ClientDetailsProps {
    // className?: string;
    id: string;
    reloadKey?: number;
}

const reducers: ReducersList = {
    clientDetails: clientDetailsReducer,
};

const ClientElementSkeleton = () => {
    return (
        <Card className={s.card} padding="32" fullWidth>
            <HStack gap="32" max align="start">
                <VStack gap="16" max>
                    <Skeleton width={300} height={32} />
                    <Skeleton width="100%" height={100} />
                    <Skeleton width={300} height={32} />
                    <Skeleton width="100%" height={100} />
                    <Skeleton width={300} height={32} />
                    <Skeleton width={300} height={32} />
                    <Skeleton width="100%" height={100} />
                </VStack>
                <Skeleton width={400} height={400} border="10%" />
            </HStack>
        </Card>
    );
};

const ClientElement = () => {
    const client = useSelector(getClientDetailsData);
    const { t } = useTranslation();

    return (
        <Card padding="32" fullWidth>
            <HStack gap="32" max align="start" justify="between">
                <VStack gap="16">
                    <ClientDetailRow label="Имя и Фамилия:" value={`${client?.firstName} ${client?.lastName}`} />
                    <ClientDetailRow label="День Рождения:" value={`${client?.birthday}`} />
                    <ClientDetailRow label="Email:" value={`${client?.email}`} />
                    <ClientDetailRow label="Тел:" value={client?.phoneNumber || '-'} />
                    <ClientDetailRow label="Социальные сети:">
                        {client?.social ? (
                            <Link to={client.social} target="_blank">
                                {t('link')}
                            </Link>
                        ) : undefined}
                    </ClientDetailRow>
                    <ClientDetailRow label="Филиал:" value={client?.branch?.name || '-'} />
                    <ClientDetailRow
                        label="Группы:"
                        value={client?.groupMemberships?.map((membership) => membership.group.name).join(', ') || '-'}
                    />
                </VStack>
                <span className={s.imageWrapper}>
                    <AppImage
                        src={client?.image as string}
                        alt={client?.firstName}
                        width={300}
                        className={s.image}
                    />
                </span>
            </HStack>
        </Card>
    );
};

export const ClientDetails = memo((props: ClientDetailsProps) => {
    const { id, reloadKey } = props;
    const dispatch = useAppDispatch();
    const isLoading = useSelector(getClientDetailsIsLoading);
    const error = useSelector(getClientDetailsError);

    useEffect(() => {
        if (id) {
            dispatch(fetchClientById(id));
        }
    }, [dispatch, id, reloadKey]);

    let content;

    if (isLoading) {
        content = <ClientElementSkeleton />;
    } else if (error) {
        content = <Text title="Клиента не существует" align="center" />;
    } else {
        content = <ClientElement />;
    }

    return <DynamicModuleLoader reducers={reducers}>{content}</DynamicModuleLoader>;
});