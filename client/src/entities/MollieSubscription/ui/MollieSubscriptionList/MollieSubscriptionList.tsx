import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieSubscriptionList.module.scss';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { MollieSubscription } from '../..';
import MollieSubscriptionItem from '../MollieSubscriptionItem/MollieSubscriptionItem';
import { StateView } from '@/shared/ui/StateView';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';

interface MollieSubscriptionListProps {
    className?: string;
    subscriptions: MollieSubscription[];
    isLoading?: boolean;
    renderAction?: (client: MollieSubscription) => ReactNode;
}

export const MollieSubscriptionList = memo((props: MollieSubscriptionListProps) => {
    const { subscriptions, isLoading, renderAction } = props;

    if (!isLoading && !subscriptions.length) {
        return (
            <StateView
                className={classNames(s.MollieSubscriptionList, {}, [])}
                title="Подписки не найдены"
                text="Активные подписки ученика появятся в этом блоке."
            />
        );
    }

    const renderMandates = (subscription: MollieSubscription) => (
        <MollieSubscriptionItem
            className={s.card}
            item={subscription}
            key={subscription.id}
            renderAction={renderAction}
        />
    );

    return (
        <VStack gap="16" max>
            <Text size="m" title="Список подписок" className={s.title} bold />
            {subscriptions.length > 0 ? subscriptions.map(renderMandates) : null}
            {isLoading && <ListSkeleton rows={subscriptions.length ? 1 : 4} height={60} />}
        </VStack>
    );
});
