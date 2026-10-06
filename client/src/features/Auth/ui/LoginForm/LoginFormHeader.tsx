import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import cls from './LoginForm.module.scss';

export const LoginFormHeader = () => {
    const { t } = useTranslation();

    return (
        <div className={cls.logoWrap}>
            <div className={cls.logo} aria-label="High Heels Dance Camp">HHDC</div>
            <VStack gap="4" align="center" className={cls.header}>
                <Text size="m" title={t('Вход в административную панель')} bold />
                <Text size="s" text={t('Управляйте подготовкой High Heels Dance Camp')} />
            </VStack>
        </div>
    );
};
