import prisma from '../../../prisma/prisma-client';
import { ChoreographerProfile, EventChoreographer, ChoreographerCost } from '@prisma/client';

export async function getProfile(personId: string): Promise<ChoreographerProfile | null> {
  return prisma.choreographerProfile.findUnique({
    where: { personId }
  });
}

export async function upsertProfile(personId: string, data: any): Promise<ChoreographerProfile> {
  return prisma.choreographerProfile.upsert({
    where: { personId },
    update: data,
    create: {
      ...data,
      personId
    }
  });
}

export async function updateEventChoreographer(id: string, data: any): Promise<EventChoreographer> {
  return prisma.eventChoreographer.update({
    where: { id },
    data
  });
}

export async function listCosts(eventChoreographerId: string): Promise<ChoreographerCost[]> {
  return prisma.choreographerCost.findMany({
    where: { eventChoreographerId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createCost(eventChoreographerId: string, data: any): Promise<ChoreographerCost> {
  return prisma.choreographerCost.create({
    data: {
      ...data,
      eventChoreographerId
    }
  });
}

export async function getCost(id: string): Promise<ChoreographerCost | null> {
  return prisma.choreographerCost.findUnique({
    where: { id }
  });
}

export async function updateCost(id: string, data: any): Promise<ChoreographerCost> {
  return prisma.choreographerCost.update({
    where: { id },
    data
  });
}

export async function deleteCost(id: string): Promise<void> {
  await prisma.choreographerCost.delete({
    where: { id }
  });
}
