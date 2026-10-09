import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { usePhotoUrl } from './usePhotoUrl';
import cls from './ChoreographerAvatar.module.scss';

export const initialsOf = (name: string): string =>
    name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('');

interface ChoreographerAvatarProps {
    personId: string;
    photoId: string | null;
    name: string;
    large?: boolean;
}

// The cover photo of a choreographer, or their initials while there is none.
export const ChoreographerAvatar = memo(({ personId, photoId, name, large = false }: ChoreographerAvatarProps) => {
    const { t } = useTranslation();
    const url = usePhotoUrl(personId, photoId);
    const className = classNames(cls.ChoreographerAvatar, { [cls.LARGE]: large });
    if (url) return <img className={className} src={url} alt={`${t('Choreographer photo')}: ${name}`} />;
    return <span className={className} aria-hidden="true">{initialsOf(name)}</span>;
});
