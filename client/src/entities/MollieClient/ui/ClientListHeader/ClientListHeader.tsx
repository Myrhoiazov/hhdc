import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientListHeader.module.scss';
import { Card } from '@/shared/ui/Card/Card';
import { HStack } from '@/shared/ui/Stack';
import { useTranslation } from 'react-i18next';

interface ClientListHeaderProps {
    className?: string;
}

const ClientListHeader = ({ className }: ClientListHeaderProps) => {
    const { t } = useTranslation();

    return (
        <Card
            padding="16"
            fullWidth
            className={classNames(s.ClientTableListHeader, {}, [className])}
        >
            <HStack max justify="between">
                <HStack gap="48">
                    <p>#</p>
                    <p>{t('Дата')}</p>
                    <p>{t('Имя Фамилия')}</p>
                    <p>{t('Имеил')}</p>
                </HStack>
                <p>{t('редактировать')}</p>
            </HStack>
        </Card>
    );
};

export default memo(ClientListHeader);
