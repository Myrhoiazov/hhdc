import { TicketingProvider, ExternalEvent, ExternalOrder } from './TicketingProvider';

export class WeeztixTicketingProvider implements TicketingProvider {
  async getEvents(): Promise<ExternalEvent[]> {
    return [
      {
        id: 'weeztix-evt-1',
        name: 'Summer Dance Camp 2026',
        startAt: '2026-07-01T10:00:00Z',
        endAt: '2026-07-05T18:00:00Z',
      },
    ];
  }

  async getOrders(eventId: string): Promise<ExternalOrder[]> {
    return [
      {
        id: 'weeztix-ord-1',
        eventId: eventId,
        buyer: {
          id: 'weeztix-usr-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
        status: 'PAID',
        currency: 'EUR',
        subtotal: 100,
        fees: 5,
        total: 105,
        orderedAt: '2026-05-01T10:00:00Z',
        items: [
          {
            id: 'weeztix-itm-1',
            name: 'Full Pass',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
            tickets: [
              {
                id: 'weeztix-tkt-1',
                ticketType: 'Full Pass',
                barcode: 'BARCODE123',
                status: 'VALID',
                participantId: 'weeztix-usr-1',
                participant: {
                  id: 'weeztix-usr-1',
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john.doe@example.com',
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
