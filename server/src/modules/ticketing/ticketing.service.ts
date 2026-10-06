import prisma from '../../../prisma/prisma-client';
import { WeeztixTicketingProvider } from '../../integrations/ticketing/weeztix/WeeztixTicketingProvider';
import { ApiError } from '../../common/http';
import { ExternalParticipant } from '../../integrations/ticketing/weeztix/TicketingProvider';

export class TicketingService {
  private provider = new WeeztixTicketingProvider();

  async syncAll(providerConnectionId: string, jobId?: string) {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: providerConnectionId },
    });
    if (!connection || connection.provider !== 'WEEZTIX') {
      throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Weeztix connection not found');
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    const syncRun = await prisma.syncRun.create({
      data: {
        providerConnectionId,
        type: 'WEEZTIX_SYNC',
        status: 'RUNNING',
      },
    });

    try {
      const events = await this.provider.getEvents();
      
      for (const extEvent of events) {
        await prisma.$transaction(async (tx) => {
          let eventEntityId: string;
          
          const eventMapping = await tx.externalIdentity.findUnique({
            where: {
              providerConnectionId_entityType_externalId: {
                providerConnectionId,
                entityType: 'EVENT',
                externalId: extEvent.id,
              },
            },
          });

          if (eventMapping) {
            const ev = await tx.event.update({
              where: { id: eventMapping.entityId },
              data: {
                name: extEvent.name,
                startAt: new Date(extEvent.startAt),
                endAt: new Date(extEvent.endAt),
              },
            });
            eventEntityId = ev.id;
            updatedCount++;
          } else {
            const ev = await tx.event.create({
              data: {
                name: extEvent.name,
                slug: extEvent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + extEvent.id,
                startAt: new Date(extEvent.startAt),
                endAt: new Date(extEvent.endAt),
                timezone: 'UTC',
                status: 'PUBLISHED',
              },
            });
            eventEntityId = ev.id;
            await tx.externalIdentity.create({
              data: {
                providerConnectionId,
                entityType: 'EVENT',
                entityId: eventEntityId,
                externalId: extEvent.id,
              },
            });
            createdCount++;
            
            await tx.activity.create({
              data: {
                type: 'EVENT_SYNCED',
                entityType: 'EVENT',
                entityId: eventEntityId,
                eventId: eventEntityId,
                metadata: { source: 'WEEZTIX' }
              }
            });
          }

          const orders = await this.provider.getOrders(extEvent.id);
          
          for (const extOrder of orders) {
            const buyerId = await this.resolvePerson(tx, providerConnectionId, extOrder.buyer);
            
            let orderEntityId: string;
            const orderMapping = await tx.externalIdentity.findUnique({
              where: {
                providerConnectionId_entityType_externalId: {
                  providerConnectionId,
                  entityType: 'ORDER',
                  externalId: extOrder.id,
                },
              },
            });

            if (orderMapping) {
              const o = await tx.order.update({
                where: { id: orderMapping.entityId },
                data: {
                  status: extOrder.status,
                  subtotal: extOrder.subtotal,
                  fees: extOrder.fees,
                  total: extOrder.total,
                },
              });
              orderEntityId = o.id;
              updatedCount++;
            } else {
              const o = await tx.order.create({
                data: {
                  eventId: eventEntityId,
                  buyerPersonId: buyerId,
                  providerConnectionId,
                  externalId: extOrder.id,
                  status: extOrder.status,
                  currency: extOrder.currency,
                  subtotal: extOrder.subtotal,
                  fees: extOrder.fees,
                  total: extOrder.total,
                  orderedAt: new Date(extOrder.orderedAt),
                  rawData: extOrder as any,
                },
              });
              orderEntityId = o.id;
              await tx.externalIdentity.create({
                data: {
                  providerConnectionId,
                  entityType: 'ORDER',
                  entityId: orderEntityId,
                  externalId: extOrder.id,
                },
              });
              createdCount++;

              await tx.activity.create({
                data: {
                  type: 'ORDER_SYNCED',
                  entityType: 'ORDER',
                  entityId: orderEntityId,
                  eventId: eventEntityId,
                  personId: buyerId,
                  metadata: { source: 'WEEZTIX' }
                }
              });
            }

            for (const extItem of extOrder.items) {
              const existingItem = await tx.orderItem.findUnique({
                where: {
                  orderId_externalId: {
                    orderId: orderEntityId,
                    externalId: extItem.id,
                  },
                },
              });

              let orderItemId = existingItem?.id;

              if (existingItem) {
                await tx.orderItem.update({
                  where: { id: orderItemId },
                  data: {
                    quantity: extItem.quantity,
                    totalPrice: extItem.totalPrice,
                  },
                });
                updatedCount++;
              } else {
                const item = await tx.orderItem.create({
                  data: {
                    orderId: orderEntityId,
                    name: extItem.name,
                    quantity: extItem.quantity,
                    unitPrice: extItem.unitPrice,
                    totalPrice: extItem.totalPrice,
                    externalId: extItem.id,
                  },
                });
                orderItemId = item.id;
                createdCount++;
              }

              for (const extTicket of extItem.tickets) {
                let holderId = buyerId;
                if (extTicket.participant) {
                  holderId = await this.resolvePerson(tx, providerConnectionId, extTicket.participant);
                }

                const existingTicket = await tx.ticket.findUnique({
                  where: {
                    providerConnectionId_externalId: {
                      providerConnectionId,
                      externalId: extTicket.id,
                    },
                  },
                });

                let ticketId: string;
                if (existingTicket) {
                  await tx.ticket.update({
                    where: { id: existingTicket.id },
                    data: {
                      status: extTicket.status,
                      holderPersonId: holderId,
                    },
                  });
                  ticketId = existingTicket.id;
                  updatedCount++;
                } else {
                  const tkt = await tx.ticket.create({
                    data: {
                      orderId: orderEntityId,
                      orderItemId,
                      eventId: eventEntityId,
                      holderPersonId: holderId,
                      providerConnectionId,
                      externalId: extTicket.id,
                      ticketType: extTicket.ticketType,
                      barcode: extTicket.barcode,
                      status: extTicket.status,
                    },
                  });
                  ticketId = tkt.id;
                  createdCount++;
                }

                if (holderId) {
                  const existingRegistration = await tx.registration.findUnique({
                    where: { ticketId },
                  });

                  if (!existingRegistration) {
                    // Avoid unique constraint failure on eventId + personId if a manual one exists.
                    const existingEvtPerson = await tx.registration.findUnique({
                       where: { eventId_personId: { eventId: eventEntityId, personId: holderId } }
                    });
                    
                    if (existingEvtPerson) {
                       await tx.registration.update({
                          where: { id: existingEvtPerson.id },
                          data: { ticketId }
                       });
                    } else {
                       await tx.registration.create({
                         data: {
                           eventId: eventEntityId,
                           personId: holderId,
                           ticketId,
                           status: extTicket.status === 'VALID' ? 'CONFIRMED' : 'PENDING',
                           registrationSource: 'WEEZTIX',
                         },
                       });
                    }
                  }
                }
              }
            }
          }
        });
      }

      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'SUCCEEDED',
          finishedAt: new Date(),
          createdCount,
          updatedCount,
          failedCount,
        },
      });
      
      return { createdCount, updatedCount, failedCount };

    } catch (error: any) {
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorSummary: error.message,
        },
      });
      throw error;
    }
  }

  private async resolvePerson(tx: any, providerConnectionId: string, extParticipant: ExternalParticipant): Promise<string> {
    const identity = await tx.externalIdentity.findUnique({
      where: {
        providerConnectionId_entityType_externalId: {
          providerConnectionId,
          entityType: 'PERSON',
          externalId: extParticipant.id,
        },
      },
    });

    if (identity) {
      return identity.entityId;
    }

    let person = await tx.person.findFirst({
      where: { email: extParticipant.email },
    });

    if (!person) {
      person = await tx.person.create({
        data: {
          firstName: extParticipant.firstName,
          lastName: extParticipant.lastName,
          displayName: `${extParticipant.firstName} ${extParticipant.lastName}`,
          email: extParticipant.email,
          source: 'WEEZTIX',
        },
      });
      
      await tx.activity.create({
        data: {
          type: 'PERSON_CREATED',
          entityType: 'PERSON',
          entityId: person.id,
          personId: person.id,
          metadata: { source: 'WEEZTIX' }
        }
      });
    }

    await tx.externalIdentity.create({
      data: {
        providerConnectionId,
        entityType: 'PERSON',
        entityId: person.id,
        externalId: extParticipant.id,
      },
    });

    return person.id;
  }
}

export const ticketingService = new TicketingService();
