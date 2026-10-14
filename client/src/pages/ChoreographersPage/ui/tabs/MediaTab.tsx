import { ChangeEvent, DragEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    listChoreographerPhotos,
    MAX_CHOREOGRAPHER_PHOTOS,
    removeChoreographerPhoto,
    reorderChoreographerPhotos,
    updateChoreographerPhoto,
    uploadChoreographerPhoto,
} from '@/entities/Choreographer';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import { ACCEPTED_TYPES, photoProblem, movePhoto } from '../../model/photos';
import { PhotoActions, PhotoCard } from './PhotoCard';

const UploadZone = memo(
    ({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) => {
        const { t } = useTranslation();
        const [over, setOver] = useState(false);
        const pick = (event: ChangeEvent<HTMLInputElement>) => {
            onFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
        };
        const drop = (event: DragEvent<HTMLLabelElement>) => {
            event.preventDefault();
            setOver(false);
            if (!disabled) onFiles(Array.from(event.dataTransfer.files));
        };
        return (
            <label
                className={classNames(own.dropZone, { [own.dropZoneOver]: over })}
                onDragOver={(event) => {
                    event.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={drop}
            >
                <input
                    className={own.hiddenInput}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    multiple
                    disabled={disabled}
                    onChange={pick}
                />
                {t('Upload photos')}
                <span className={own.secondary}>
                    {t('Drop files here or choose them. JPEG, PNG or WebP, up to 10 MB each.')}
                </span>
            </label>
        );
    }
);

// onChanged lets the page refresh what it shows of the photos, such as the cover in the header.
export const MediaTab = memo(
    ({
        personId,
        canManage,
        onChanged,
    }: {
        personId: string;
        canManage: boolean;
        onChanged?: () => void;
    }) => {
        const { t } = useTranslation();
        const load = useCallback(() => listChoreographerPhotos(personId), [personId]);
        const photos = useResource(load);
        const [error, setError] = useState('');
        const [busy, setBusy] = useState(false);
        const list = photos.data ?? [];
        const run = async (work: () => Promise<unknown>) => {
            setBusy(true);
            setError('');
            try {
                await work();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
            } finally {
                setBusy(false);
                await photos.refresh();
                onChanged?.();
            }
        };
        // Files go up one by one, so the server-side limit is reported for the exact file that hits it.
        const upload = (files: File[]) =>
            run(async () => {
                let count = list.length;
                for (const file of files) {
                    const problem = photoProblem(file, count);
                    if (problem) throw new Error(`${file.name}: ${t(problem)}`);
                    await uploadChoreographerPhoto(personId, file);
                    count += 1;
                }
            });
        const actions: PhotoActions = {
            onMove: (id, step) =>
                void run(() =>
                    reorderChoreographerPhotos(
                        personId,
                        movePhoto(
                            list.map((photo) => photo.id),
                            id,
                            step
                        )
                    )
                ),
            onCover: (id) =>
                void run(() => updateChoreographerPhoto(personId, id, { isCover: true })),
            onRights: (id, rightsStatus) =>
                void run(() => updateChoreographerPhoto(personId, id, { rightsStatus })),
            onRemove: (id) => {
                if (window.confirm(t('Remove this photo?')))
                    void run(() => removeChoreographerPhoto(personId, id));
            },
        };
        return (
            <Panel aria-label={t('Photos')}>
                <h2>{t('Photos')}</h2>
                <p className={cls.muted}>{`${list.length} / ${MAX_CHOREOGRAPHER_PHOTOS}`}</p>
                <RequestState
                    error={error || photos.error}
                    loading={photos.loading && !photos.data}
                />
                {canManage && list.length < MAX_CHOREOGRAPHER_PHOTOS && (
                    <UploadZone disabled={busy} onFiles={(files) => void upload(files)} />
                )}
                <ul className={own.photoGrid}>
                    {list.map((photo, index) => (
                        <PhotoCard
                            key={photo.id}
                            personId={personId}
                            photo={photo}
                            index={index}
                            total={list.length}
                            canManage={canManage && !busy}
                            actions={actions}
                        />
                    ))}
                </ul>
                {photos.data?.length === 0 && <p className={cls.muted}>{t('No photos yet.')}</p>}
            </Panel>
        );
    }
);
