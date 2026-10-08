import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUserAuthData } from '@/entities/User';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button } from '@/shared/ui/Button';
import { LangSwitcher } from '@/shared/ui/LangSwitcher';
import { ThemeSwitcher } from '@/shared/ui/ThemeSwitcher';
import { AvatarDropdown } from '@/features/avatarDropdown';
import { ComposeEmailModal } from '@/features/composeEmail';
import { CreatePersonModal } from '@/features/createPerson';
import cls from './Navbar.module.scss';
import logo from '@/shared/assets/logo/hhdc-logo.png';

const ComposeEmailAction = memo(() => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);
    return <><Button onClick={() => setOpen(true)}>{t('New email')}</Button><ComposeEmailModal isOpen={open} onClose={close} /></>;
});

const CreatePersonAction = memo(() => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);
    // The new person opens right away, so the result is visible from any page.
    const created = useCallback((person: { id: string }) => { setOpen(false); navigate(`/people/${person.id}`); }, [navigate]);
    return <><Button onClick={() => setOpen(true)}>{t('Add person')}</Button><CreatePersonModal isOpen={open} onClose={close} onCreated={created} /></>;
});

export const Navbar = memo(({ className, onMobileMenuToggle }: { className?: string; onMobileMenuToggle?: () => void }) => {
    const user = useSelector(getUserAuthData);
    const { t } = useTranslation();
    if (!user) return null;
    return <div className={classNames(cls.Navbar, {}, [className])}>
        <div className={cls.left}><button className={cls.hamburger} onClick={onMobileMenuToggle} aria-label={t('Menu')}><span /><span /><span /></button><img className={cls.logo} src={logo} alt="" /><strong>{t('HHDC Event CRM')}</strong></div>
        <div className={cls.actions}>
            {user.permissions.includes('communications.reply') && <ComposeEmailAction />}
            {user.permissions.includes('people.write') && <CreatePersonAction />}
            <LangSwitcher className={cls.langSwitcher} /><ThemeSwitcher className={cls.themeSwitcher} /><AvatarDropdown />
        </div>
    </div>;
});
