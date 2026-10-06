import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MandateList.module.scss';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import MandateItem from '../MandateItem/MandateItem';
import { Mandate } from '../../model/types/mandate';
import { StateView } from '@/shared/ui/StateView';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';

interface MandateListProps {
    className?: string;
    mandates: Mandate[];
    isLoading?: boolean;
    renderAction?: (mandate: Mandate) => ReactNode;
}

export const MandateList = memo((props: MandateListProps) => {
    const { className, mandates, isLoading, renderAction } = props;

    if (!isLoading && !mandates.length) {
        return (
            <StateView
                className={classNames(s.MandateList, {}, [className])}
                title="Мандаты не найдены"
                text="После привязки платёжного метода список появится здесь."
            />
        );
    }

    const renderMandates = (mandate: Mandate) => (
        <MandateItem className={s.card} item={mandate} key={mandate.id} renderAction={renderAction} />
    );

    return (
        <VStack gap="16" max>
            <Text size="m" title="Список мандатов" className={s.title} bold />
            {mandates.length > 0 ? mandates.map(renderMandates) : null}
            {isLoading && <ListSkeleton rows={mandates.length ? 1 : 4} height={60} />}
        </VStack>
    );
});
