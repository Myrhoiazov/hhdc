import { memo, useEffect } from 'react';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientDetailsSliceReducer } from '../../model/slice/clientDetailsSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { fetchClientById } from '../../model/services/fetchClientById/fetchClientById';
import { useSelector } from 'react-redux';
import {
    getClientDetailsError,
    getClientDetailsIsLoading,
} from '../../model/selectors/clientDetails';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './ClientDetails.module.scss';
import { MollieClientEventsTimeline } from './MollieClientEventsTimeline';
import { MollieClientProfileCard } from './MollieClientProfileCard';

interface ClientDetailsProps {
    id: string;
}

const reducers: ReducersList = {
    mollieClientDetails: mollieClientDetailsSliceReducer,
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
    return (
        <VStack gap="16" max>
            <MollieClientProfileCard />
            <MollieClientEventsTimeline />
        </VStack>
    );
};

export const ClientDetails = memo((props: ClientDetailsProps) => {
    const { id } = props;
    const dispatch = useAppDispatch();
    const isLoading = useSelector(getClientDetailsIsLoading);
    const error = useSelector(getClientDetailsError);

    useEffect(() => {
        if (id) {
            dispatch(fetchClientById(id));
        }
    }, [dispatch, id]);

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
