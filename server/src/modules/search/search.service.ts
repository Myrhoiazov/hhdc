import prisma from '../../../prisma/prisma-client';

export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return {
      people: [],
      events: [],
      orders: [],
      tickets: [],
    };
  }

  const q = query.trim();
  const searchPattern = `%${q}%`; // useful for RAW queries if needed, but Prisma uses `contains`

  const [people, events, orders, tickets] = await Promise.all([
    // Search Person
    prisma.person.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
        status: 'ACTIVE'
      },
      take: 10,
    }),

    // Search Event
    prisma.event.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      take: 10,
    }),

    // Search Order
    prisma.order.findMany({
      where: {
        externalId: { contains: q, mode: 'insensitive' },
      },
      take: 10,
    }),

    // Search Ticket
    prisma.ticket.findMany({
      where: {
        OR: [
          { externalId: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 10,
    })
  ]);

  return {
    people,
    events,
    orders,
    tickets,
  };
}
