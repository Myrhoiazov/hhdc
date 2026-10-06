import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Choreographer } from '../ChoreographerCard/ChoreographerCard';
import { useAdditionalPhotos } from './useAdditionalPhotos';

const runSingleUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    uploadFile: (file: File) => Promise<string | null>,
    setUploading: (value: boolean) => void,
    setValue: (value: string) => void,
) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setValue(url);
    setUploading(false);
    e.target.value = '';
};

export const usePhotoUploads = (isOpen: boolean, editChoreographer?: Choreographer | null) => {
    const [photo, setPhoto] = useState<string | null>(null);
    const [mainPhoto, setMainPhoto] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingMain, setUploadingMain] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const mainInputRef = useRef<HTMLInputElement>(null);
    const extraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setPhoto(editChoreographer?.photo ?? null);
        setMainPhoto(editChoreographer?.mainPhoto ?? null);
    }, [isOpen, editChoreographer]);

    const uploadFile = useCallback(async (file: File): Promise<string | null> => {
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await $apiPrivate.post<{ url: string }>('/schedule/choreographers/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data.url;
        } catch {
            toast.error('Ошибка загрузки фото');
            return null;
        }
    }, []);

    const { additionalPhotos, uploadingExtra, onExtraChange, removeExtra } = useAdditionalPhotos(
        isOpen, editChoreographer, uploadFile,
    );

    const onAvatarChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => runSingleUpload(e, uploadFile, setUploadingPhoto, setPhoto),
        [uploadFile],
    );
    const onMainChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => runSingleUpload(e, uploadFile, setUploadingMain, setMainPhoto),
        [uploadFile],
    );

    return {
        photo, setPhoto, mainPhoto, setMainPhoto, additionalPhotos, removeExtra,
        uploadingPhoto, uploadingMain, uploadingExtra,
        avatarInputRef, mainInputRef, extraInputRef,
        onAvatarChange, onMainChange, onExtraChange,
    };
};
