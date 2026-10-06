import prisma from '../../../prisma/prisma-client';
import { DocumentTemplate, Document } from '@prisma/client';

export async function listTemplates(): Promise<DocumentTemplate[]> {
  return prisma.documentTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createTemplate(data: any): Promise<DocumentTemplate> {
  return prisma.documentTemplate.create({ data });
}

export async function getTemplate(id: string): Promise<DocumentTemplate | null> {
  return prisma.documentTemplate.findUnique({ where: { id } });
}

export async function updateTemplate(id: string, data: any): Promise<DocumentTemplate> {
  return prisma.documentTemplate.update({
    where: { id },
    data
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.documentTemplate.delete({ where: { id } });
}

export async function listDocuments(entityType?: string, entityId?: string): Promise<Document[]> {
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { template: true }
  });
}

export async function createDocument(data: any): Promise<Document> {
  return prisma.document.create({ data });
}

export async function getDocument(id: string): Promise<Document | null> {
  return prisma.document.findUnique({
    where: { id },
    include: { template: true }
  });
}

export async function updateDocument(id: string, data: any): Promise<Document> {
  return prisma.document.update({
    where: { id },
    data
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await prisma.document.delete({ where: { id } });
}
