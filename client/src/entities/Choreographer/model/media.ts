export const MEDIA_RIGHTS = ['UNKNOWN', 'PERMITTED', 'RESTRICTED'] as const;

export type MediaRights = (typeof MEDIA_RIGHTS)[number];

export const MAX_CHOREOGRAPHER_PHOTOS = 10;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export interface ChoreographerPhoto {
    id: string;
    position: number;
    isCover: boolean;
    caption: string | null;
    credit: string | null;
    rightsStatus: MediaRights;
    rightsNotes: string | null;
    width: number;
    height: number;
}

export interface PhotoDetails {
    caption?: string;
    credit?: string;
    rightsStatus?: MediaRights;
    rightsNotes?: string;
}
