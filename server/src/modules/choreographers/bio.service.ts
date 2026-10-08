import { ChoreographerBioKind } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { assertChoreographer } from './profile.service';

export const bioVersionSchema = z.object({
    locale: z.string().trim().toLowerCase().regex(/^[a-z]{2}(-[a-z]{2})?$/, 'Use a language code such as en or nl'),
    kind: z.nativeEnum(ChoreographerBioKind),
    // Stored and shown as plain text: no markup is ever interpreted.
    content: z.string().trim().min(1).max(20000),
}).strict();
export type BioVersionInput = z.infer<typeof bioVersionSchema>;

const HISTORY_LIMIT = 100;

// Current variants first, then their earlier versions, newest first.
export const listBioVersions = async (personId: string) => {
    await assertChoreographer(personId);
    return prisma.choreographerBioVersion.findMany({
        where: { personId }, take: HISTORY_LIMIT,
        orderBy: [{ isCurrent: 'desc' }, { locale: 'asc' }, { kind: 'asc' }, { version: 'desc' }],
    });
};

// Versions are never edited: saving a biography adds the next version and makes it current.
export const addBioVersion = async (personId: string, input: BioVersionInput, userId: string) => {
    await assertChoreographer(personId);
    return prisma.$transaction(async tx => {
        const variant = { personId, locale: input.locale, kind: input.kind };
        const latest = await tx.choreographerBioVersion.findFirst({ where: variant, orderBy: { version: 'desc' } });
        if (latest?.isCurrent && latest.content === input.content) return latest;
        await tx.choreographerBioVersion.updateMany({ where: { ...variant, isCurrent: true }, data: { isCurrent: false } });
        const created = await tx.choreographerBioVersion.create({ data: { ...variant, content: input.content, version: (latest?.version ?? 0) + 1, createdById: userId } });
        await tx.activity.create({ data: { personId, actorUserId: userId, type: 'CHOREOGRAPHER_BIO_UPDATED', entityType: 'ChoreographerBioVersion', entityId: created.id, metadata: { locale: input.locale, kind: input.kind, version: created.version } } });
        return created;
    }, { isolationLevel: 'Serializable' });
};
