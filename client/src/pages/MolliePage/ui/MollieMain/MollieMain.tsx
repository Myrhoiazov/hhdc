import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './MollieMain.module.scss';
import { useMollieOrganizations } from './useMollieOrganizations';
import { MollieOrganizationCard } from './MollieOrganizationCard';

export const MollieMain = memo(() => {
    const { organizations, isLoading, error } = useMollieOrganizations();
    const { t } = useTranslation('home');

    return (
        <VStack gap="16" max className={s.MollieMain}>
            <HStack max justify="between" align="center">
                <div>
                    <Text title="Mollie Company" size="m" bold />
                    <Text text="Профиль компании и быстрые действия для Mollie." size="s" className={s.subtitle} />
                </div>
            </HStack>

            {isLoading && <Skeleton width="100%" height={260} border="16px" />}

            {error && (
                <Card padding="24" fullWidth className={s.companyCard}>
                    <Text
                        title="Не удалось загрузить компанию"
                        text="Проверьте подключение Mollie или попробуйте обновить страницу."
                        size="m"
                    />
                </Card>
            )}

            {!isLoading && !error && organizations.length === 0 && (
                <Card padding="24" fullWidth className={s.companyCard}>
                    <Text title={t('No organizations found')} size="m" />
                </Card>
            )}

            {!isLoading && !error && organizations.map((org) => (
                <MollieOrganizationCard key={org.id} org={org} />
            ))}
        </VStack>
    );
});