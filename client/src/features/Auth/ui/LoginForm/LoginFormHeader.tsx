import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { AppImage } from '@/shared/ui/AppImage';
import { VStack } from '@/shared/ui/Stack';
import Logo from '@/shared/assets/logo/ddc_logo.png';
import Logo_White from '@/shared/assets/logo/ddc_logo_white.png';
import { Theme } from '@/shared/const/theme';
import { useTheme } from '@/shared/lib/hooks/useTheme/useTheme';
import cls from './LoginForm.module.scss';

export const LoginFormHeader = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    return (
        <div className={cls.logoWrap}>
            <AppImage
                src={theme === Theme.DARK ? Logo_White : Logo}
                alt="DDC Talent Center"
                width={112}
            />
            <VStack gap="4" align="center" className={cls.header}>
                <Text size="m" title={t('Добро пожаловать')} bold />
                <Text size="s" text={t('Войдите в рабочее пространство HHDC Admin')} />
            </VStack>
        </div>
    );
};
