import { TicketingProvider, ExternalEvent, ExternalOrder } from './TicketingProvider';

export class TicketingProviderNotImplementedError extends Error {
  constructor() {
    super('Weeztix API adapter is not implemented yet: the Weeztix API contract and credentials are required');
  }
}

// The previous implementation returned hard-coded sample orders, which a sync would have
// written into the CRM as real people. Until the real Weeztix API contract is wired in,
// the adapter fails loudly so a sync run is recorded as FAILED instead of importing fake data.
export class WeeztixTicketingProvider implements TicketingProvider {
  async getEvents(): Promise<ExternalEvent[]> {
    throw new TicketingProviderNotImplementedError();
  }

  async getOrders(_eventId: string): Promise<ExternalOrder[]> {
    throw new TicketingProviderNotImplementedError();
  }
}
