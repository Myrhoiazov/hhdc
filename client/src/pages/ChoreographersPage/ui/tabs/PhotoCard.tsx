import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerPhoto, MEDIA_RIGHTS, MediaRights } from '@/entities/Choreographer';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button } from '@/shared/ui/Button';
import { usePhotoUrl } from '../../model/usePhotoUrl';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';

const PhotoImage = memo(({ personId, photo }: { personId: string; photo: ChoreographerPhoto }) => {
    const { t } = useTranslation();
    const url = usePhotoUrl(personId, photo.id);
    return url ? (
        <img className={own.photoImage} src={url} alt={photo.caption || t('Choreographer photo')} />
    ) : (
        <div className={own.photoImage} aria-hidden="true" />
    );
});

export interface PhotoActions {
    onMove: (id: string, step: -1 | 1) => void;
    onCover: (id: string) => void;
    onRights: (id: string, rights: MediaRights) => void;
    onRemove: (id: string) => void;
}

export const PhotoCard = memo(
    ({
        personId,
        photo,
        index,
        total,
        canManage,
        actions,
    }: {
        personId: string;
        photo: ChoreographerPhoto;
        index: number;
        total: number;
        canManage: boolean;
        actions: PhotoActions;
    }) => {
        const { t } = useTranslation();
        const label = `${t('Photo')} ${index + 1}`;
        return (
            <li
                className={classNames(own.photoCard, { [own.coverCard]: photo.isCover })}
                aria-label={label}
            >
                <PhotoImage personId={personId} photo={photo} />
                <div className={own.chips}>
                    {photo.isCover && <span className={own.chip}>{t('Cover')}</span>}
                    <span className={own.chip}>{`${photo.width}×${photo.height}`}</span>
                </div>
                {canManage ? (
                    <>
                        <label className={own.inlineSelect}>
                            {t('Usage rights')}
                            <select
                                value={photo.rightsStatus}
                                onChange={(event) =>
                                    actions.onRights(photo.id, event.target.value as MediaRights)
                                }
                            >
                                {MEDIA_RIGHTS.map((value) => (
                                    <option key={value} value={value}>
                                        {t(`RIGHTS_${value}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className={cls.actions}>
                            <Button
                                disabled={index === 0}
                                aria-label={`${label}: ${t('Move earlier')}`}
                                onClick={() => actions.onMove(photo.id, -1)}
                            >
                                ←
                            </Button>
                            <Button
                                disabled={index === total - 1}
                                aria-label={`${label}: ${t('Move later')}`}
                                onClick={() => actions.onMove(photo.id, 1)}
                            >
                                →
                            </Button>
                            {!photo.isCover && (
                                <Button
                                    aria-label={`${label}: ${t('Make cover')}`}
                                    onClick={() => actions.onCover(photo.id)}
                                >
                                    {t('Make cover')}
                                </Button>
                            )}
                            <Button
                                aria-label={`${label}: ${t('Remove')}`}
                                onClick={() => actions.onRemove(photo.id)}
                            >
                                {t('Remove')}
                            </Button>
                        </div>
                    </>
                ) : (
                    <span className={own.secondary}>{t(`RIGHTS_${photo.rightsStatus}`)}</span>
                )}
            </li>
        );
    }
);
