import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack } from '@/shared/ui/Stack';
import { LangSwitcher } from '@/shared/ui/LangSwitcher';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import { ThemeSwitcher } from '@/shared/ui/ThemeSwitcher';
import { AvatarDropdown } from '@/features/avatarDropdown';
import { GlobalSearch } from '@/features/globalSearch';
import AddClientIcon from '@/shared/assets/icons/add_user_icon.svg';
import cls from './Navbar.module.scss';

interface NavbarActionsProps {
    isAdmin: boolean;
    unreadEmailCount: number;
    onOpenAddClientModal: () => void;
}

export const NavbarActions = memo(({ isAdmin, unreadEmailCount, onOpenAddClientModal }: NavbarActionsProps) => {
    const { t } = useTranslation();

    return (
        <HStack className={cls.actions} justify="end" gap="8">
            <Button
                theme={ButtonTheme.BACKGROUND_INVERTED}
                className={cls.addClientBtn}
                onClick={onOpenAddClientModal}
            >
                <span className={cls.addClientLabel}>{t('Добавить клиента')}</span>
                <Icon Svg={AddClientIcon} width={20} color="fill" />
            </Button>
            <GlobalSearch />
            <LangSwitcher className={cls.langSwitcher} />
            {isAdmin && (
                <button className={cls.notification} type="button" aria-label="Непрочитанные письма">
                    <span className={cls.bell}>{t('⌾')}</span>
                    {unreadEmailCount > 0 && (
                        <span className={cls.badge}>{unreadEmailCount > 99 ? '99+' : unreadEmailCount}</span>
                    )}
                </button>
            )}
            <ThemeSwitcher className={cls.themeSwitcher} />
            <AvatarDropdown />
        </HStack>
    );
});