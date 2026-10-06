import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { Choreographer } from '../ChoreographerCard/ChoreographerCard';

const parseAdditionalPhotos = (json: string | null | undefined): string[] => {
    if (!json) return [];
    try {
        return JSON.parse(json);
    } catch {
        return [];
    }
};

export const useAdditionalPhotos = (
    isOpen: boolean,
    editChoreographer: Choreographer | null | undefined,
    uploadFile: (file: File) => Promise<string | null>,
) => {
    const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
    const [uploadingExtra, setUploadingExtra] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setAdditionalPhotos(parseAdditionalPhotos(editChoreographer?.additionalPhotos));
    }, [isOpen, editChoreographer]);

    const onExtraChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        if (additionalPhotos.length >= 5) { toast.warn('Максимум 5 фото'); return; }
        setUploadingExtra(true);
        const url = await uploadFile(e.target.files[0]);
        if (url) setAdditionalPhotos((prev) => [...prev, url]);
        setUploadingExtra(false);
        e.target.value = '';
    }, [additionalPhotos.length, uploadFile]);

    const removeExtra = useCallback(
        (idx: number) => setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx)),
        [],
    );

    return {
        additionalPhotos, uploadingExtra, onExtraChange, removeExtra,
    };
};
