export interface ExternalEvent {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
}

export interface ExternalParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ExternalTicket {
  id: string;
  ticketType: string;
  barcode: string;
  status: 'VALID' | 'USED' | 'CANCELLED' | 'REFUNDED' | 'TRANSFERRED';
  participantId?: string;
  participant?: ExternalParticipant;
}

export interface ExternalOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  tickets: ExternalTicket[];
}

export interface ExternalOrder {
  id: string;
  eventId: string;
  buyer: ExternalParticipant;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  currency: string;
  subtotal: number;
  fees: number;
  total: number;
  orderedAt: string;
  items: ExternalOrderItem[];
}

export interface TicketingProvider {
  getEvents(): Promise<ExternalEvent[]>;
  getOrders(eventId: string): Promise<ExternalOrder[]>;
}
