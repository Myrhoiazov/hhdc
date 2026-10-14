import { MAX_CHOREOGRAPHER_PHOTOS, MAX_PHOTO_BYTES } from '@/entities/Choreographer';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Returns the translation key of the reason a file cannot be uploaded, or an empty string.
export const photoProblem = (file: File, activeCount: number): string => {
    if (activeCount >= MAX_CHOREOGRAPHER_PHOTOS)
        return 'A choreographer can have at most 10 photos';
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
