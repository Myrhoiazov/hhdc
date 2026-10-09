import { useEffect, useState } from 'react';
import { fetchChoreographerPhoto } from '@/entities/crm';

// Photos are private, so the thumbnail is fetched with the staff session and shown from memory.
// Returns an empty string until the image is loaded, and when there is no photo.
export const usePhotoUrl = (personId: string, photoId: string | null): string => {
    const [url, setUrl] = useState('');
    useEffect(() => {
        setUrl('');
        if (!photoId) return undefined;
        let objectUrl = '';
        let current = true;
        fetchChoreographerPhoto(personId, photoId, 'thumb').then((blob) => {
            if (!current) return;
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
        }).catch(() => undefined);
        return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [personId, photoId]);
    return url;
};
