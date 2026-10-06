import { memo, type ChangeEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { toAbsUrl } from './useChoreographerModal';
import s from './ChoreographerModal.module.scss';

interface ChoreographerPhotoSectionProps {
    photo: string | null;
    mainPhoto: string | null;
    additionalPhotos: string[];
    uploadingPhoto: boolean;
    uploadingMain: boolean;
    uploadingExtra: boolean;
    firstNameRu: string;
    lastNameRu: string;
    avatarInputRef: RefObject<HTMLInputElement | null>;
    mainInputRef: RefObject<HTMLInputElement | null>;
    extraInputRef: RefObject<HTMLInputElement | null>;
    onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onMainChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onExtraChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveMain: () => void;
    onRemoveExtra: (index: number) => void;
}

const AvatarPicker = ({
    photo,
    firstNameRu,
    lastNameRu,
    uploading,
    inputRef,
    onChange,
}: {
    photo: string | null;
    firstNameRu: string;
    lastNameRu: string;
    uploading: boolean;
    inputRef: RefObject<HTMLInputElement | null>;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.avatarSection}>
            <div className={s.avatarWrap}>
                {photo
                    ? <img className={s.avatar} src={toAbsUrl(photo)!} alt="avatar" />
                    : <div className={s.avatarPlaceholder}>{firstNameRu?.[0] ?? '?'}{lastNameRu?.[0] ?? ''}</div>
                }
            </div>
            <input ref={inputRef} type="file" accept="image/*" className={s.fileInput} onChange={onChange} />
            <button type="button" className={s.uploadBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Загрузка...' : 'Изменить фото'}
            </button>
            <div className={s.uploadHint}>{t('JPG, PNG, WEBP — до 5 МБ')}</div>
        </div>
    );
};

const MainPhotoPicker = ({
    mainPhoto,
    uploading,
    inputRef,
    onChange,
    onRemove,
}: {
    mainPhoto: string | null;
    uploading: boolean;
    inputRef: RefObject<HTMLInputElement | null>;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.mainPhotoSection}>
            <label className={s.label}>{t('Основное фото для сайта')}</label>
            {mainPhoto && (
                <div className={s.mainPhotoWrap}>
                    <img className={s.mainPhoto} src={toAbsUrl(mainPhoto)!} alt="main" />
                    <button type="button" className={s.removePhotoBtn} onClick={onRemove}>{t('Удалить')}</button>
                </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className={s.fileInput} onChange={onChange} />
            <button type="button" className={s.uploadBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Загрузка...' : 'Изменить основное фото'}
            </button>
        </div>
    );
};

const ExtraPhotosPicker = ({
    additionalPhotos,
    uploading,
    inputRef,
    onChange,
    onRemove,
}: {
    additionalPhotos: string[];
    uploading: boolean;
    inputRef: RefObject<HTMLInputElement | null>;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.extraSection}>
            <label className={s.label}>{t('Дополнительные фото (до 5)')}</label>
            <div className={s.extraGrid}>
                {additionalPhotos.map((url, idx) => (
                    <div key={idx} className={s.extraItem}>
                        <img className={s.extraImg} src={toAbsUrl(url)!} alt={`extra-${idx}`} />
                        <button type="button" className={s.removeExtraBtn} onClick={() => onRemove(idx)}>×</button>
                    </div>
                ))}
                {additionalPhotos.length < 5 && (
                    <>
                        <input ref={inputRef} type="file" accept="image/*" className={s.fileInput} onChange={onChange} />
                        <button type="button" className={s.addExtraBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
                            {uploading ? '...' : '+ Добавить фото'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export const ChoreographerPhotoSection = memo((props: ChoreographerPhotoSectionProps) => {
    const {
        photo, mainPhoto, additionalPhotos,
        uploadingPhoto, uploadingMain, uploadingExtra,
        firstNameRu, lastNameRu,
        avatarInputRef, mainInputRef, extraInputRef,
        onAvatarChange, onMainChange, onExtraChange,
        onRemoveMain, onRemoveExtra,
    } = props;

    return (
        <>
            <AvatarPicker
                photo={photo}
                firstNameRu={firstNameRu}
                lastNameRu={lastNameRu}
                uploading={uploadingPhoto}
                inputRef={avatarInputRef}
                onChange={onAvatarChange}
            />

            <MainPhotoPicker
                mainPhoto={mainPhoto}
                uploading={uploadingMain}
                inputRef={mainInputRef}
                onChange={onMainChange}
                onRemove={onRemoveMain}
            />

            <ExtraPhotosPicker
                additionalPhotos={additionalPhotos}
                uploading={uploadingExtra}
                inputRef={extraInputRef}
                onChange={onExtraChange}
                onRemove={onRemoveExtra}
            />
        </>
    );
});
