import { z } from 'zod';
import { DocumentType, DocumentStatus } from '@prisma/client';

export const CreateDocumentTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(DocumentType),
  content: z.string()
});

export const UpdateDocumentTemplateSchema = CreateDocumentTemplateSchema.partial();

export const CreateDocumentSchema = z.object({
  templateId: z.string().uuid().optional(),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  type: z.nativeEnum(DocumentType),
  status: z.nativeEnum(DocumentStatus).optional(),
  title: z.string().min(1),
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateDocumentSchema = CreateDocumentSchema.partial();
