import { KnowledgeScope, KnowledgeStatus, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { optionalFilter } from '../../common/filters';

// Filters of the list of knowledge documents. An empty filter in the address means no filter.
const optional = optionalFilter;

export const knowledgeFiltersSchema = z.object({
    q: optional(z.string().trim().max(200)), scope: optional(z.nativeEnum(KnowledgeScope)), status: optional(z.nativeEnum(KnowledgeStatus)),
    eventId: optional(z.string().uuid()),
});
export type KnowledgeFilters = z.infer<typeof knowledgeFiltersSchema>;

export const knowledgeWhere = (filters: KnowledgeFilters): Prisma.KnowledgeDocumentWhereInput => ({
    ...(filters.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
    ...(filters.scope ? { scope: filters.scope } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.eventId ? { eventId: filters.eventId } : {}),
});
