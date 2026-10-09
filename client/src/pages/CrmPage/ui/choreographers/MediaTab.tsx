import { ChangeEvent, DragEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerPhoto, listChoreographerPhotos, MAX_CHOREOGRAPHER_PHOTOS, MAX_PHOTO_BYTES, MEDIA_RIGHTS, MediaRights,
    removeChoreographerPhoto, reorderChoreographerPhotos, updateChoreographerPhoto, uploadChoreographerPhoto,
} from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '../common';
import { usePhotoUrl } from './usePhotoUrl';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Returns the translation key of the reason a file cannot be uploaded, or an empty string.
export const photoProblem = (file: File, activeCount: number): string => {
    if (activeCount >= MAX_CHOREOGRAPHER_PHOTOS) return 'A choreographer can have at most 10 photos';
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only JPEG, PNG and WebP photos are accepted';
    return file.size > MAX_PHOTO_BYTES ? 'A photo cannot be larger than 10 MB' : '';
};

export const movePhoto = (ids: string[], id: string, step: -1 | 1): string[] => {
    const from = ids.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return ids;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
};

const PhotoImage = memo(({ personId, photo }: { personId: string; photo: ChoreographerPhoto }) => {
    const { t } = useTranslation();
    const url = usePhotoUrl(personId, photo.id);
    return url ? <img className={own.photoImage} src={url} alt={photo.caption || t('Choreographer photo')} /> : <div className={own.photoImage} aria-hidden="true" />;
});

interface PhotoActions {
    onMove: (id: string, step: -1 | 1) => void;
    onCover: (id: string) => void;
    onRights: (id: string, rights: MediaRights) => void;
    onRemove: (id: string) => void;
}

const PhotoCard = memo(({ personId, photo, index, total, canManage, actions }: {
    personId: string; photo: ChoreographerPhoto; index: number; total: number; canManage: boolean; actions: PhotoActions;
}) => {
    const { t } = useTranslation();
    const label = `${t('Photo')} ${index + 1}`;
    return <li className={classNames(own.photoCard, { [own.coverCard]: photo.isCover })} aria-label={label}>
        <PhotoImage personId={personId} photo={photo} />
        <div className={own.chips}>
            {photo.isCover && <span className={own.chip}>{t('Cover')}</span>}
            <span className={own.chip}>{`${photo.width}×${photo.height}`}</span>
        </div>
        {canManage ? <>
            <label className={own.inlineSelect}>{t('Usage rights')}
                <select value={photo.rightsStatus} onChange={(event) => actions.onRights(photo.id, event.target.value as MediaRights)}>
                    {MEDIA_RIGHTS.map((value) => <option key={value} value={value}>{t(`RIGHTS_${value}`)}</option>)}
                </select></label>
            <div className={cls.actions}>
                <Button disabled={index === 0} aria-label={`${label}: ${t('Move earlier')}`} onClick={() => actions.onMove(photo.id, -1)}>←</Button>
                <Button disabled={index === total - 1} aria-label={`${label}: ${t('Move later')}`} onClick={() => actions.onMove(photo.id, 1)}>→</Button>
                {!photo.isCover && <Button aria-label={`${label}: ${t('Make cover')}`} onClick={() => actions.onCover(photo.id)}>{t('Make cover')}</Button>}
                <Button aria-label={`${label}: ${t('Remove')}`} onClick={() => actions.onRemove(photo.id)}>{t('Remove')}</Button>
            </div>
        </> : <span className={own.secondary}>{t(`RIGHTS_${photo.rightsStatus}`)}</span>}
    </li>;
});

const UploadZone = memo(({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) => {
    const { t } = useTranslation();
    const [over, setOver] = useState(false);
    const pick = (event: ChangeEvent<HTMLInputElement>) => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ''; };
    const drop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setOver(false); if (!disabled) onFiles(Array.from(event.dataTransfer.files)); };
    return <label className={classNames(own.dropZone, { [own.dropZoneOver]: over })}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        <input className={own.hiddenInput} type="file" accept={ACCEPTED_TYPES.join(',')} multiple disabled={disabled} onChange={pick} />
        {t('Upload photos')}
        <span className={own.secondary}>{t('Drop files here or choose them. JPEG, PNG or WebP, up to 10 MB each.')}</span>
    </label>;
});

// onChanged lets the page refresh what it shows of the photos, such as the cover in the header.
export const MediaTab = memo(({ personId, canManage, onChanged }: { personId: string; canManage: boolean; onChanged?: () => void }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listChoreographerPhotos(personId), [personId]);
    const photos = useResource(load);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const list = photos.data ?? [];
    const run = async (work: () => Promise<unknown>) => {
        setBusy(true); setError('');
        try { await work(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); await photos.refresh(); onChanged?.(); }
    };
    // Files go up one by one, so the server-side limit is reported for the exact file that hits it.
    const upload = (files: File[]) => run(async () => {
        let count = list.length;
        for (const file of files) {
            const problem = photoProblem(file, count);
            if (problem) throw new Error(`${file.name}: ${t(problem)}`);
            await uploadChoreographerPhoto(personId, file);
            count += 1;
        }
    });
    const actions: PhotoActions = {
        onMove: (id, step) => void run(() => reorderChoreographerPhotos(personId, movePhoto(list.map((photo) => photo.id), id, step))),
        onCover: (id) => void run(() => updateChoreographerPhoto(personId, id, { isCover: true })),
        onRights: (id, rightsStatus) => void run(() => updateChoreographerPhoto(personId, id, { rightsStatus })),
        onRemove: (id) => { if (window.confirm(t('Remove this photo?'))) void run(() => removeChoreographerPhoto(personId, id)); },
    };
    return <section className={cls.panel} aria-label={t('Photos')}>
        <h2>{t('Photos')}</h2>
        <p className={cls.muted}>{`${list.length} / ${MAX_CHOREOGRAPHER_PHOTOS}`}</p>
        <RequestState error={error || photos.error} loading={photos.loading && !photos.data} />
        {canManage && list.length < MAX_CHOREOGRAPHER_PHOTOS && <UploadZone disabled={busy} onFiles={(files) => void upload(files)} />}
        <ul className={own.photoGrid}>{list.map((photo, index) => <PhotoCard key={photo.id} personId={personId} photo={photo} index={index}
            total={list.length} canManage={canManage && !busy} actions={actions} />)}</ul>
        {photos.data?.length === 0 && <p className={cls.muted}>{t('No photos yet.')}</p>}
    </section>;
});
