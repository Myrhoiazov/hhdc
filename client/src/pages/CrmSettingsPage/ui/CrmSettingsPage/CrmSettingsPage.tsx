import { memo } from 'react';
import { Page } from '@/widgets/Page/Page';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './CrmSettingsPage.module.scss';
import { MollieConnectionCard } from './MollieConnectionCard';
import { useMollieConnection } from './useMollieConnection';

const CrmSettingsPage = memo(() => {
    const { connection, isLoading, isDisconnecting, error, onConnect, onDisconnect } = useMollieConnection();

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <div>
                    <Text title="Настройки CRM" size="l" bold />
                    <Text text="Интеграции и системные параметры CRM." size="s" className={s.subtitle} />
                </div>

                {isLoading && <Skeleton width="100%" height={360} border="16px" />}

                {error && (
                    <Card padding="24" fullWidth className={s.card}>
                        <Text title="Не удалось загрузить статус Mollie" text="Проверьте соединение с сервером." size="m" />
                    </Card>
                )}

                {!isLoading && !error && connection && <MollieConnectionCard connection={connection} isDisconnecting={isDisconnecting} onConnect={onConnect} onDisconnect={onDisconnect} />}
            </VStack>
        </Page>
    );
});

export default CrmSettingsPage;
