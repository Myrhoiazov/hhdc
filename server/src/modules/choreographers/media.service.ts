import { MediaRightsStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { processImage, type ProcessedImage } from '../../common/storage/image';
import { newStorageKey, sha256, storage } from '../../common/storage/storage';
import { canAddPhoto, isCompleteOrder, MAX_ACTIVE_PHOTOS, nextCoverId } from './media.rules';
import { assertChoreographer } from './profile.service';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => (value === '' ? null : value));

export const mediaDetailsSchema = z.object({
    caption: optionalText(300), credit: optionalText(200), rightsNotes: optionalText(1000),
    rightsStatus: z.nativeEnum(MediaRightsStatus).optional(),
}).strict();
export const mediaUpdateSchema = mediaDetailsSchema.extend({ isCover: z.literal(true).optional() }).strict();
export const mediaOrderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(MAX_ACTIVE_PHOTOS) }).strict();
export type MediaDetails = z.infer<typeof mediaDetailsSchema>;
export type MediaVariant = 'thumb' | 'display' | 'original';

const PUBLIC_FIELDS = { id: true, position: true, isCover: true, caption: true, credit: true, rightsStatus: true, rightsNotes: true, width: true, height: true, createdAt: true } as const;
const active = (personId: string): Prisma.ChoreographerMediaWhereInput => ({ personId, deletedAt: null });

export const listMedia = async (personId: string) => {
    await assertChoreographer(personId);
    return prisma.choreographerMedia.findMany({ where: active(personId), orderBy: { position: 'asc' }, select: PUBLIC_FIELDS });
};

interface StoredFile { key: string; content: Buffer; mimeType: string; filename: string }

const EXTENSIONS: Record<ProcessedImage['format'], string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

const planFiles = (personId: string, upload: { content: Buffer; filename: string }, image: ProcessedImage): StoredFile[] => {
    const folder = `choreographers/${personId}`;
    return [
        { key: newStorageKey(folder, EXTENSIONS[image.format]), content: upload.content, mimeType: `image/${image.format}`, filename: upload.filename },
        { key: newStorageKey(folder, 'webp'), content: image.display, mimeType: 'image/webp', filename: 'display.webp' },
        { key: newStorageKey(folder, 'webp'), content: image.thumb, mimeType: 'image/webp', filename: 'thumb.webp' },
    ];
};

const writeFiles = async (files: StoredFile[]) => { for (const file of files) await storage().put(file.key, file.content); };
// Compensation for a failed database write: no file may be left without a record.
const removeFiles = async (files: StoredFile[]) => { await Promise.allSettled(files.map(file => storage().remove(file.key))); };

const createObjects = async (tx: Prisma.TransactionClient, files: StoredFile[]) => Promise.all(files.map(file => tx.storageObject.create({ data: {
    provider: storage().name, key: file.key, originalFilename: file.filename.slice(0, 255), mimeType: file.mimeType, bytes: file.content.length, sha256: sha256(file.content),
} })));

// Serialises photo changes of one choreographer: two uploads racing for the tenth slot are
// counted one after the other, so the cap holds under concurrency.
const lockPerson = (tx: Prisma.TransactionClient, personId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${personId}))`;

export interface PhotoUpload { content: Buffer; filename: string }

interface AddParams { personId: string; upload: PhotoUpload; details: MediaDetails; userId: string }

const insertPhoto = async (params: AddParams, files: StoredFile[], image: ProcessedImage) => prisma.$transaction(async tx => {
    await lockPerson(tx, params.personId);
    const existing = await tx.choreographerMedia.findMany({ where: active(params.personId), select: { position: true } });
    if (!canAddPhoto(existing.length)) throw new ApiError(409, 'MEDIA_LIMIT_REACHED', `A choreographer can have at most ${MAX_ACTIVE_PHOTOS} photos`);
    const [original, display, thumb] = await createObjects(tx, files);
    const media = await tx.choreographerMedia.create({ select: PUBLIC_FIELDS, data: {
        personId: params.personId, originalObjectId: original.id, displayObjectId: display.id, thumbObjectId: thumb.id,
        position: Math.max(-1, ...existing.map(item => item.position)) + 1, isCover: existing.length === 0,
        width: image.width, height: image.height, createdById: params.userId, ...params.details,
    } });
    await tx.activity.create({ data: { personId: params.personId, actorUserId: params.userId, type: 'CHOREOGRAPHER_PHOTO_ADDED', entityType: 'ChoreographerMedia', entityId: media.id, metadata: {} } });
    return media;
});

export const addPhoto = async (params: AddParams) => {
    await assertChoreographer(params.personId);
    const image = await processImage(params.upload.content);
    const files = planFiles(params.personId, params.upload, image);
    await writeFiles(files);
    try { return await insertPhoto(params, files, image); }
    catch (error) {
        await removeFiles(files);
        throw error;
    }
};

const requireMedia = async (tx: Prisma.TransactionClient, personId: string, mediaId: string) => {
    const media = await tx.choreographerMedia.findFirst({ where: { id: mediaId, ...active(personId) } });
    if (!media) throw new ApiError(404, 'MEDIA_NOT_FOUND', 'Photo not found');
    return media;
};

export const updatePhoto = async (personId: string, mediaId: string, input: z.infer<typeof mediaUpdateSchema>) => prisma.$transaction(async tx => {
    await lockPerson(tx, personId);
    await requireMedia(tx, personId, mediaId);
    const { isCover, ...details } = input;
    if (isCover) await tx.choreographerMedia.updateMany({ where: { ...active(personId), isCover: true }, data: { isCover: false } });
    return tx.choreographerMedia.update({ where: { id: mediaId }, data: { ...details, ...(isCover ? { isCover: true } : {}) }, select: PUBLIC_FIELDS });
});

export const reorderPhotos = async (personId: string, ids: string[]) => prisma.$transaction(async tx => {
    await lockPerson(tx, personId);
    const current = await tx.choreographerMedia.findMany({ where: active(personId), select: { id: true } });
    if (!isCompleteOrder(current.map(item => item.id), ids)) throw new ApiError(400, 'MEDIA_ORDER_INVALID', 'The order must list every photo exactly once');
    for (const [position, id] of ids.entries()) await tx.choreographerMedia.update({ where: { id }, data: { position } });
    return tx.choreographerMedia.findMany({ where: active(personId), orderBy: { position: 'asc' }, select: PUBLIC_FIELDS });
});

// Soft delete: the record and its files stay until a storage cleanup removes them.
export const removePhoto = async (personId: string, mediaId: string, userId: string) => prisma.$transaction(async tx => {
    await lockPerson(tx, personId);
    await requireMedia(tx, personId, mediaId);
    await tx.choreographerMedia.update({ where: { id: mediaId }, data: { deletedAt: new Date(), isCover: false } });
    const remaining = await tx.choreographerMedia.findMany({ where: active(personId), select: { id: true, position: true, isCover: true } });
    const cover = nextCoverId(remaining);
    if (cover) await tx.choreographerMedia.update({ where: { id: cover }, data: { isCover: true } });
    await tx.activity.create({ data: { personId, actorUserId: userId, type: 'CHOREOGRAPHER_PHOTO_REMOVED', entityType: 'ChoreographerMedia', entityId: mediaId, metadata: {} } });
    return { deleted: true };
});

const OBJECT_FIELD: Record<MediaVariant, 'thumbObjectId' | 'displayObjectId' | 'originalObjectId'> = { thumb: 'thumbObjectId', display: 'displayObjectId', original: 'originalObjectId' };

// The storage key never leaves the server: the caller gets bytes and a content type only.
export const readPhoto = async (personId: string, mediaId: string, variant: MediaVariant) => {
    const media = await requireMedia(prisma, personId, mediaId);
    const object = await prisma.storageObject.findUniqueOrThrow({ where: { id: media[OBJECT_FIELD[variant]] } });
    return { content: await storage().read(object.key), mimeType: object.mimeType, filename: object.originalFilename };
};
