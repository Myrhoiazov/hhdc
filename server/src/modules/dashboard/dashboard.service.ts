import prisma from '../../../prisma/prisma-client';

export async function getSummaryStats() {
  const [
    upcomingEventsCount,
    totalParticipants,
    ticketsSold,
    openConversations,
    aiDraftsAwaitingApproval,
    providers
  ] = await Promise.all([
    prisma.event.count({
      where: {
        startAt: { gt: new Date() },
        status: { in: ['PUBLISHED', 'ACTIVE'] },
      },
    }),
    prisma.personRole.count({
      where: {
        role: 'PARTICIPANT',
      },
    }),
    prisma.ticket.count({
      where: {
        status: { in: ['VALID', 'USED'] },
      },
    }),
    prisma.conversation.count({
      where: {
        status: 'OPEN',
      },
    }),
    prisma.aiDraft.count({
      where: {
        status: { in: ['GENERATED', 'EDITED'] },
      },
    }),
    prisma.providerConnection.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    }),
  ]);

  const providerHealth = {
    connected: 0,
    error: 0,
    disconnected: 0,
    disabled: 0,
  };

  providers.forEach((p: any) => {
    const status = p.status.toLowerCase() as keyof typeof providerHealth;
    if (providerHealth[status] !== undefined) {
      providerHealth[status] = p._count.id;
    }
  });

  return {
    upcomingEventsCount,
    totalParticipants,
    ticketsSold,
    openConversations,
    aiDraftsAwaitingApproval,
    providerHealth,
  };
}
