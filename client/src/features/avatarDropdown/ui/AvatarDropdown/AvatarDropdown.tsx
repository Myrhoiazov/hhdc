import { useTranslation } from 'react-i18next';
import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { classNames } from '@/shared/lib/classNames/classNames';
import { getUserAuthData, logout } from '@/entities/User';
import { getRouteProfile, getRouteSettings } from '@/shared/const/router';
import { Dropdown } from '@/shared/ui/Popups';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useNavigate } from 'react-router-dom';
import s from './AvatarDropdown.module.scss';

interface AvatarDropdownProps {
    className?: string;
}

export const AvatarDropdown = memo((props: AvatarDropdownProps) => {
    const { className } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const authData = useSelector(getUserAuthData);

    const onLogout = useCallback(() => {
        dispatch(logout());
        navigate('/login');
    }, [dispatch]);

    if (!authData) {
        return null;
    }

    const items = [
        {
            content: t('Настройки'),
            href: getRouteSettings(),
        },
        {
            content: t('Профиль'),
            href: getRouteProfile(authData.id),
        },
        {
            content: t('Выйти'),
            onClick: onLogout,
        },
    ];

    return (
        <Dropdown
            direction="bottom left"
            className={classNames(s.AvatarDropdown, {}, [className])}
            items={items}
            trigger={<Avatar className={s.avatar} size={44} src={authData.avatar} />}
        />
    );
});
