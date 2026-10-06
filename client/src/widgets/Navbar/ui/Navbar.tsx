import { memo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUserAuthData } from '@/entities/User';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button } from '@/shared/ui/Button';
import { LangSwitcher } from '@/shared/ui/LangSwitcher';
import { ThemeSwitcher } from '@/shared/ui/ThemeSwitcher';
import { AvatarDropdown } from '@/features/avatarDropdown';
import cls from './Navbar.module.scss';

export const Navbar = memo(({ className, onMobileMenuToggle }: { className?: string; onMobileMenuToggle?: () => void }) => {
    const user = useSelector(getUserAuthData);
    const navigate = useNavigate();
    const { t } = useTranslation();
    if (!user) return null;
    return <div className={classNames(cls.Navbar, {}, [className])}>
        <div className={cls.left}><button className={cls.hamburger} onClick={onMobileMenuToggle} aria-label={t('Menu')}><span /><span /><span /></button><strong>{t('HHDC Event CRM')}</strong></div>
        <div className={cls.actions}>{user.permissions.includes('people.write') && <Button onClick={() => navigate('/people')}>{t('Add person')}</Button>}<LangSwitcher /><ThemeSwitcher /><AvatarDropdown /></div>
    </div>;
});
