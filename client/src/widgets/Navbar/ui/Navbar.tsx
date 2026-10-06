import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Navbar.module.scss';
import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { AppImage } from '@/shared/ui/AppImage';
import Logo from '@/shared/assets/logo/ddc_logo.png';
import { ClientFormModal } from '@/features/addClientForm';
import { CLIENT_CREATED_EVENT } from '@/shared/const/events';
import { NavbarActions } from './NavbarActions';
import { useUnreadEmailCount } from './useUnreadEmailCount';

interface NavbarProps {
    className?: string;
    onMobileMenuToggle?: () => void;
}

export const Navbar = memo(({ className, onMobileMenuToggle }: NavbarProps) => {
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
    const unreadEmailCount = useUnreadEmailCount(isAdmin);

    const onOpenAddClientModal = useCallback(() => {
        setIsAddClientModalOpen(true);
    }, []);

    const onCloseAddClientModal = useCallback(() => {
        setIsAddClientModalOpen(false);
    }, []);

    // ClientsPage owns its own client list state; Navbar (a widget) must not reach
    // into a page's internals, so a plain DOM event signals "refresh if you're listening".
    const onClientCreated = useCallback(() => {
        window.dispatchEvent(new Event(CLIENT_CREATED_EVENT));
    }, []);

    if (!authData) {
        return null;
    }

    return (
        <div className={classNames(cls.Navbar, {}, [className])}>
            <div className={cls.left}>
                <button className={cls.hamburger} onClick={onMobileMenuToggle} aria-label="Меню">
                    <span /><span /><span />
                </button>
                <AppImage src={Logo} alt="DDC" className={cls.logo} />
            </div>
            <NavbarActions
                isAdmin={isAdmin}
                unreadEmailCount={unreadEmailCount}
                onOpenAddClientModal={onOpenAddClientModal}
            />

            <ClientFormModal
                isOpen={isAddClientModalOpen}
                onClose={onCloseAddClientModal}
                reloadPage={onClientCreated}
            />
        </div>
    );
});