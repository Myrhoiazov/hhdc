import { Request } from 'express';
import { z } from 'zod';
import * as service from './documents.service';
import { CreateDocumentTemplateSchema, UpdateDocumentTemplateSchema, CreateDocumentSchema, UpdateDocumentSchema } from './documents.schemas';

export async function listTemplates(_req: Request) {
    return service.listTemplates();
}

export async function createTemplate(req: Request) {
    const data = CreateDocumentTemplateSchema.parse(req.body);
    return service.createTemplate(data);
}

export async function getTemplate(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.getTemplate(id);
}

export async function updateTemplate(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = UpdateDocumentTemplateSchema.parse(req.body);
    return service.updateTemplate(id, data);
}

export async function deleteTemplate(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await service.deleteTemplate(id);
    return { success: true };
}

export async function listDocuments(req: Request) {
    const { entityType, entityId } = req.query;
    return service.listDocuments(entityType as string, entityId as string);
}

export async function createDocument(req: Request) {
    const data = CreateDocumentSchema.parse(req.body);
    return service.createDocument(data);
}

export async function getDocument(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.getDocument(id);
}

export async function updateDocument(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = UpdateDocumentSchema.parse(req.body);
    return service.updateDocument(id, data);
}

export async function deleteDocument(req: Request) {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await service.deleteDocument(id);
    return { success: true };
}
