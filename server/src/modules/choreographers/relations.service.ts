import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { assertChoreographer } from './profile.service';
import { hiddenActivityPrefixes, ownAddresses, provenanceOf } from './relations.rules';

const PAGE_SIZE = 20;
const PREVIEW_CHARS = 240;

export const conversationQuerySchema = z.object({ q: z.string().trim().min(1).max(200).optional(), page: z.coerce.number().int().min(1).default(1) });
export const linkSchema = z.object({ note: z.string().trim().min(3).max(500), assignmentId: z.string().uuid().nullable().optional() }).strict();
export const unlinkSchema = z.object({ note: z.string().trim().min(3).max(500) }).strict();

const THREAD = {
    id: true, subject: true, status: true, lastMessageAt: true, personId: true,
    event: { select: { id: true, name: true } },
    person: { select: { id: true, displayName: true, email: true } },
    messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { direction: true, sender: true, recipient: true, bodyText: true, createdAt: true } },
} satisfies Prisma.ConversationSelect;
type Thread = Prisma.ConversationGetPayload<{ select: typeof THREAD }>;

// Mail bodies stay in Message; the profile only shows a short preview of the latest one.
const toPreview = ({ bodyText, ...message }: Thread['messages'][number]) => ({ ...message, preview: bodyText.slice(0, PREVIEW_CHARS) });

const toItem = ({ messages, ...thread }: Thread) => ({ ...thread, latestMessage: messages[0] ? toPreview(messages[0]) : null });

const searchWhere = (q?: string): Prisma.ConversationWhereInput => (q ? { OR: [
    { subject: { contains: q, mode: 'insensitive' } },
    { messages: { some: { OR: [{ sender: { contains: q, mode: 'insensitive' } }, { bodyText: { contains: q, mode: 'insensitive' } }] } } },
] } : {});

const activeLinks = (personId: string) => prisma.choreographerConversationLink.findMany({
    where: { personId, removedAt: null }, select: { id: true, conversationId: true, linkReason: true, note: true, createdAt: true, assignmentId: true },
});

// Threads written from one of the choreographer's own extra addresses that are neither theirs
// nor linked yet. They are suggestions only: showing one on the profile takes an explicit link.
const findCandidates = async (personId: string, excludeIds: string[]) => {
    const contacts = await prisma.choreographerContact.findMany({ where: { personId }, select: { kind: true, email: true, isActive: true } });
    const addresses = ownAddresses(contacts);
    if (!addresses.length) return [];
    const threads = await prisma.conversation.findMany({
        // A thread without a person is a candidate too (`personId <> x` alone would skip NULLs).
        where: { id: { notIn: excludeIds }, OR: [{ personId: null }, { personId: { not: personId } }], messages: { some: { direction: 'INBOUND', sender: { in: addresses } } } },
        select: THREAD, orderBy: { lastMessageAt: 'desc' }, take: 10,
    });
    return threads.map(toItem);
};

export const listConversations = async (personId: string, query: z.infer<typeof conversationQuerySchema>) => {
    await assertChoreographer(personId);
    const links = await activeLinks(personId);
    const linkedIds = links.map(link => link.conversationId);
    const where: Prisma.ConversationWhereInput = { AND: [{ OR: [{ personId }, { id: { in: linkedIds } }] }, searchWhere(query.q)] };
    const [threads, total] = await prisma.$transaction([
        prisma.conversation.findMany({ where, select: THREAD, orderBy: { lastMessageAt: 'desc' }, skip: (query.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        prisma.conversation.count({ where }),
    ]);
    const data = threads.map(thread => ({
        ...toItem(thread), provenance: provenanceOf(thread, personId),
        link: links.find(link => link.conversationId === thread.id) ?? null,
    }));
    const ownThreadIds = (await prisma.conversation.findMany({ where: { personId }, select: { id: true } })).map(thread => thread.id);
    return { data, candidates: query.page === 1 && !query.q ? await findCandidates(personId, [...linkedIds, ...ownThreadIds]) : [], meta: { page: query.page, pageSize: PAGE_SIZE, total } };
};

interface Actor { userId: string }

const audit = (tx: Prisma.TransactionClient, action: string, link: { id: string; personId: string; conversationId: string }, actor: Actor, note: string) => Promise.all([
    tx.activity.create({ data: { personId: link.personId, actorUserId: actor.userId, type: action, entityType: 'Conversation', entityId: link.conversationId, metadata: {} } }),
    tx.auditLog.create({ data: { actorUserId: actor.userId, action, entityType: 'ChoreographerConversationLink', entityId: link.id, after: { conversationId: link.conversationId, personId: link.personId, note } } }),
]);

// The conversation itself is untouched: it keeps its own person, and may be linked to several
// choreographers, each by its own explicit record.
export const linkConversation = async (personId: string, conversationId: string, input: z.infer<typeof linkSchema>, actor: Actor) => {
    await assertChoreographer(personId);
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true, personId: true } });
    if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    if (conversation.personId === personId) throw new ApiError(409, 'ALREADY_OWN_THREAD', 'This conversation already belongs to the choreographer');
    if (input.assignmentId && !(await prisma.eventChoreographer.count({ where: { id: input.assignmentId, personId } }))) throw new ApiError(400, 'ASSIGNMENT_MISMATCH', 'The assignment does not belong to this choreographer');
    try {
        return await prisma.$transaction(async tx => {
            const link = await tx.choreographerConversationLink.create({ data: { personId, conversationId, linkReason: 'MANUAL', note: input.note, assignmentId: input.assignmentId ?? null, createdById: actor.userId } });
            await audit(tx, 'CHOREOGRAPHER_CONVERSATION_LINKED', link, actor, input.note);
            return link;
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'ALREADY_LINKED', 'This conversation is already linked');
        throw error;
    }
};

// Unlinking removes the conversation from the profile only; the conversation and its mail stay.
export const unlinkConversation = async (personId: string, conversationId: string, input: z.infer<typeof unlinkSchema>, actor: Actor) => {
    const link = await prisma.choreographerConversationLink.findFirst({ where: { personId, conversationId, removedAt: null } });
    if (!link) throw new ApiError(404, 'LINK_NOT_FOUND', 'This conversation is not linked by hand');
    return prisma.$transaction(async tx => {
        const removed = await tx.choreographerConversationLink.update({ where: { id: link.id }, data: { removedAt: new Date(), removedById: actor.userId, removalNote: input.note } });
        await audit(tx, 'CHOREOGRAPHER_CONVERSATION_UNLINKED', removed, actor, input.note);
        return { unlinked: true };
    });
};

export const activityQuerySchema = z.object({
    type: z.string().trim().max(80).regex(/^[A-Z_]+$/).optional(),
    eventId: z.string().uuid().optional(),
    // Keyset pagination: "older than this entry".
    before: z.string().datetime().optional(),
});

const ACTIVITY_PAGE = 30;

export const listActivity = async (personId: string, query: z.infer<typeof activityQuerySchema>, permissions: string[]) => {
    await assertChoreographer(personId);
    const rows = await prisma.activity.findMany({
        where: {
            personId, ...(query.eventId ? { eventId: query.eventId } : {}), ...(query.type ? { type: { startsWith: query.type } } : {}),
            ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
            NOT: hiddenActivityPrefixes(permissions).map(prefix => ({ type: { startsWith: prefix } })),
        },
        orderBy: { createdAt: 'desc' }, take: ACTIVITY_PAGE + 1,
        select: { id: true, type: true, entityType: true, entityId: true, createdAt: true, actorUserId: true, event: { select: { id: true, name: true } } },
    });
    const page = rows.slice(0, ACTIVITY_PAGE);
    const actors = await prisma.user.findMany({ where: { id: { in: page.flatMap(row => (row.actorUserId ? [row.actorUserId] : [])) } }, select: { id: true, name: true } });
    return {
        data: page.map(({ actorUserId, ...row }) => ({ ...row, actor: actors.find(user => user.id === actorUserId)?.name ?? null })),
        nextBefore: rows.length > ACTIVITY_PAGE ? page[page.length - 1].createdAt.toISOString() : null,
    };
};
