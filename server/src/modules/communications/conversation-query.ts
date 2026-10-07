import { ConversationStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

const conversationQuerySchema = z.object({
    status: z.nativeEnum(ConversationStatus).optional(),
    eventId: z.string().uuid().optional(),
    providerConnectionId: z.string().uuid().optional(),
    q: z.string().trim().min(1).max(200).optional(),
});

export type ConversationQuery = z.infer<typeof conversationQuerySchema>;

export const parseConversationQuery = (query: unknown): ConversationQuery =>
    conversationQuerySchema.parse(query);

const searchWhere = (q: string): Prisma.ConversationWhereInput => ({
    OR: [
        { subject: { contains: q, mode: 'insensitive' } },
        { person: { is: { OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
        ] } } },
        { messages: { some: { bodyText: { contains: q, mode: 'insensitive' } } } },
    ],
});

export const buildConversationWhere = (query: ConversationQuery): Prisma.ConversationWhereInput => ({
    ...(query.status ? { status: query.status } : {}),
    ...(query.eventId ? { eventId: query.eventId } : {}),
    ...(query.providerConnectionId
        ? { messages: { some: { providerConnectionId: query.providerConnectionId } } }
        : {}),
    ...(query.q ? { AND: [searchWhere(query.q)] } : {}),
});
