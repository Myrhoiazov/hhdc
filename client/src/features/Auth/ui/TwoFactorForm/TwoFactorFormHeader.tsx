import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import cls from './TwoFactorForm.module.scss';

interface TwoFactorFormHeaderProps {
    maskedEmail: string;
}

export const TwoFactorFormHeader = ({ maskedEmail }: TwoFactorFormHeaderProps) => {
    const { t } = useTranslation();

    return (
        <VStack gap="4" align="center" className={cls.header}>
            <Text size="m" title={t('Введите код подтверждения')} bold />
            <Text size="s" text={t('Мы отправили код на {{email}}', { email: maskedEmail })} />
        </VStack>
    );
};
