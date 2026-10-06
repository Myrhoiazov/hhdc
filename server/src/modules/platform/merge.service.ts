import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { FieldDecisions, MERGE_FIELDS, findDuplicatePairs, orderedPair, planFieldUpdates } from './duplicate-rules';

type Tx = Prisma.TransactionClient;
const SCAN_LIMIT = 10000;
const decision = z.enum(['source', 'target']);
export const mergeSchema = z.object({
    sourcePersonId: z.string().uuid(),
    fieldDecisions: z.object(Object.fromEntries(MERGE_FIELDS.map(field => [field, decision.optional()]))).strict().default({}),
}).strict();

export const scanDuplicates = async () => {
    const people = await prisma.person.findMany({ where: { status: 'ACTIVE', OR: [{ email: { not: null } }, { phone: { not: null } }] }, take: SCAN_LIMIT, select: { id: true, firstName: true, lastName: true, email: true, phone: true } });
    const pairs = findDuplicatePairs(people);
    const created = await prisma.duplicateCandidate.createMany({ data: pairs, skipDuplicates: true });
    return { scanned: people.length, candidates: pairs.length, created: created.count };
};

const loadPair = async (targetId: string, sourceId: string) => {
    if (targetId === sourceId) throw new ApiError(400, 'MERGE_SAME_PERSON', 'Choose two different people');
    const [target, source] = await Promise.all([prisma.person.findUnique({ where: { id: targetId } }), prisma.person.findUnique({ where: { id: sourceId } })]);
    if (!target || !source) throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found');
    if (source.mergedIntoId || source.status === 'ARCHIVED' || target.status === 'ARCHIVED') throw new ApiError(409, 'MERGE_NOT_ALLOWED', 'Archived or already merged people cannot be merged');
    return { target, source };
};

const relationCounts = (personId: string) => prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { _count: { select: { registrations: true, orders: true, tickets: true, conversations: true, tags: true, roles: true, choreographerAssignments: true } } } });

// Read-only preview of what a merge would move; nothing is changed.
export const previewMerge = async (targetId: string, sourceId: string) => {
    const { target, source } = await loadPair(targetId, sourceId);
    const fields = MERGE_FIELDS.filter(field => String(source[field] ?? '') !== String(target[field] ?? '')).map(field => ({ field, source: source[field], target: target[field] }));
    return { target: { id: target.id, displayName: target.displayName }, source: { id: source.id, displayName: source.displayName }, differingFields: fields, moves: (await relationCounts(sourceId))._count };
};

// Rows that would collide with a unique key on the target stay on the archived source.
const moveEventScoped = async (tx: Tx, sourceId: string, targetId: string) => {
    const [registered, assigned] = await Promise.all([
        tx.registration.findMany({ where: { personId: targetId }, select: { eventId: true } }),
        tx.eventChoreographer.findMany({ where: { personId: targetId }, select: { eventId: true } }),
    ]);
    await tx.registration.updateMany({ where: { personId: sourceId, eventId: { notIn: registered.map(row => row.eventId) } }, data: { personId: targetId } });
    await tx.eventChoreographer.updateMany({ where: { personId: sourceId, eventId: { notIn: assigned.map(row => row.eventId) } }, data: { personId: targetId } });
};

const moveMemberships = async (tx: Tx, sourceId: string, targetId: string) => {
    const [roles, tags, consents] = await Promise.all([
        tx.personRole.findMany({ where: { personId: sourceId } }), tx.personTag.findMany({ where: { personId: sourceId } }), tx.consent.findMany({ where: { personId: sourceId } }),
    ]);
    await tx.personRole.createMany({ data: roles.map(row => ({ personId: targetId, role: row.role })), skipDuplicates: true });
    await tx.personTag.createMany({ data: tags.map(row => ({ personId: targetId, tagId: row.tagId })), skipDuplicates: true });
    await tx.consent.createMany({ data: consents.map(({ id: _id, metadata, ...row }) => ({ ...row, metadata: metadata as Prisma.InputJsonValue, personId: targetId })), skipDuplicates: true });
};

const moveOwnedRecords = async (tx: Tx, sourceId: string, targetId: string) => {
    const where = { personId: sourceId };
    const data = { personId: targetId };
    await tx.order.updateMany({ where: { buyerPersonId: sourceId }, data: { buyerPersonId: targetId } });
    await tx.ticket.updateMany({ where: { holderPersonId: sourceId }, data: { holderPersonId: targetId } });
    await tx.conversation.updateMany({ where, data });
    await tx.activity.updateMany({ where, data });
    await tx.payment.updateMany({ where, data });
    await tx.refund.updateMany({ where, data });
    await tx.deliveryLog.updateMany({ where, data });
    await tx.task.updateMany({ where, data });
    await tx.externalIdentity.updateMany({ where: { entityType: 'Person', entityId: sourceId }, data: { entityId: targetId } });
};

export interface MergeParams { targetId: string; sourceId: string; fieldDecisions: FieldDecisions; actorUserId: string }

// Transactional, human-approved merge (ADR 0017). The source is archived, never deleted.
export const mergePeople = async ({ targetId, sourceId, fieldDecisions, actorUserId }: MergeParams) => {
    const { source } = await loadPair(targetId, sourceId);
    const [personAId, personBId] = orderedPair(targetId, sourceId);
    return prisma.$transaction(async tx => {
        await moveEventScoped(tx, sourceId, targetId);
        await moveMemberships(tx, sourceId, targetId);
        await moveOwnedRecords(tx, sourceId, targetId);
        const updates = planFieldUpdates(source, fieldDecisions);
        const target = await tx.person.update({ where: { id: targetId }, data: updates });
        await tx.person.update({ where: { id: targetId }, data: { displayName: `${target.firstName} ${target.lastName}`.trim() } });
        await tx.person.update({ where: { id: sourceId }, data: { status: 'ARCHIVED', mergedIntoId: targetId } });
        const merge = await tx.personMerge.create({ data: { sourcePersonId: sourceId, targetPersonId: targetId, fieldDecisions, performedBy: actorUserId } });
        await tx.duplicateCandidate.updateMany({ where: { personAId, personBId }, data: { status: 'MERGED', resolvedAt: new Date(), resolvedBy: actorUserId } });
        await tx.auditLog.create({ data: { actorUserId, action: 'PERSON_MERGED', entityType: 'Person', entityId: targetId, after: { sourcePersonId: sourceId, mergeId: merge.id } } });
        return merge;
    }, { timeout: 30000 });
};
