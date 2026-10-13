import { $apiPrivate } from '@/shared/api/api';
import { patchData, postData, readData } from '@/shared/api/request';
import { ChoreographerPhoto, PhotoDetails } from '../model/media';

export const listChoreographerPhotos = async (personId: string) =>
    readData<ChoreographerPhoto[]>(`/choreographers/${personId}/media`);

export const uploadChoreographerPhoto = async (
    personId: string,
    file: File,
    details: PhotoDetails = {}
) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(details).forEach(([name, value]) => {
        if (value) form.append(name, value);
    });
    return postData<ChoreographerPhoto>(`/choreographers/${personId}/media`, form);
};

export const updateChoreographerPhoto = async (
    personId: string,
    mediaId: string,
    input: PhotoDetails & { isCover?: true }
) => patchData<ChoreographerPhoto>(`/choreographers/${personId}/media/${mediaId}`, input);

export const reorderChoreographerPhotos = async (personId: string, ids: string[]) =>
    patchData<ChoreographerPhoto[]>(`/choreographers/${personId}/media/reorder`, { ids });

export const removeChoreographerPhoto = async (personId: string, mediaId: string) => {
    await $apiPrivate.delete(`/choreographers/${personId}/media/${mediaId}`);
};

// Photos are private: they are fetched with the staff session and shown from memory, never by a public URL.
export const fetchChoreographerPhoto = async (
    personId: string,
    mediaId: string,
    variant: 'thumb' | 'display' = 'thumb'
): Promise<Blob> =>
    (
        await $apiPrivate.get<Blob>(
            `/choreographers/${personId}/media/${mediaId}/file?variant=${variant}`,
            { responseType: 'blob' }
        )
    ).data;
