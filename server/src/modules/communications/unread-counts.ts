import prisma from '../../../prisma/prisma-client';

export interface UnreadRow { providerConnectionId: string | null; conversationId: string }

// A conversation counts once for its mailbox, however many unread letters it holds.
export const countByMailbox = (rows: UnreadRow[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    const seen = new Set<string>();
    for (const row of rows) {
        const key = `${row.providerConnectionId}:${row.conversationId}`;
        if (!row.providerConnectionId || seen.has(key)) continue;
        seen.add(key);
        counts[row.providerConnectionId] = (counts[row.providerConnectionId] ?? 0) + 1;
    }
    return counts;
};

// Conversations with unread incoming mail, per mailbox: the numbers on the mailbox tabs.
export const unreadByMailbox = async (): Promise<Record<string, number>> => countByMailbox(await prisma.message.findMany({
    where: { direction: 'INBOUND', isRead: false, providerConnectionId: { not: null } },
    select: { providerConnectionId: true, conversationId: true },
    distinct: ['providerConnectionId', 'conversationId'],
}));
