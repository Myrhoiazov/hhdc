import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { permitted } from '../auth/auth.middleware';
import { ApiError, entityId, listRoute, route } from '../../common/http';
import { normalizePagination } from '../../common/http';
import { SEGMENT_FIELDS, segmentDefinitionSchema, segmentWhere } from './segment-dsl';

export const segmentsRouter = Router();

const segmentSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    // Rejected at save time: a definition that does not compile is never stored.
    filterDsl: segmentDefinitionSchema.or(z.object({}).strict()).refine(definition => {
        try { segmentWhere(definition); return true; } catch { return false; }
    }, 'Segment uses an unsupported field or operator'),
});

segmentsRouter.get('/', permitted('communications.read'), listRoute(async req => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.segment.findMany({ skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.segment.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
}));

segmentsRouter.get('/:id', permitted('communications.read'), route(async req => {
    const data = await prisma.segment.findUnique({ where: { id: entityId(req) } });
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Segment not found');
    return data;
}));

segmentsRouter.post('/', permitted('communications.write'), route(async req => {
    const input = segmentSchema.parse(req.body);
    return prisma.segment.create({ data: {
        name: input.name,
        description: input.description,
        filterDsl: input.filterDsl || {}
    } });
}));

segmentsRouter.patch('/:id', permitted('communications.write'), route(async req => {
    const input = segmentSchema.partial().parse(req.body);
    const data: any = { ...input };
    return prisma.segment.update({ where: { id: entityId(req) }, data });
}));

segmentsRouter.delete('/:id', permitted('communications.write'), route(async req => {
    await prisma.segment.delete({ where: { id: entityId(req) } });
    return { success: true };
}));

segmentsRouter.get('/meta/fields', permitted('communications.read'), route(async () => ({ fields: SEGMENT_FIELDS, operators: ['eq', 'neq', 'in'] })));

// Dry run: evaluates the stored DSL into a typed filter; no arbitrary SQL is ever executed.
segmentsRouter.post('/:id/preview', permitted('communications.read'), route(async req => {
    const segment = await prisma.segment.findUnique({ where: { id: entityId(req) } });
    if (!segment) throw new ApiError(404, 'NOT_FOUND', 'Segment not found');
    const where = segmentWhere(segment.filterDsl);
    const [sample, total] = await prisma.$transaction([
        prisma.person.findMany({ where, take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, displayName: true, email: true, language: true } }),
        prisma.person.count({ where }),
    ]);
    return { sample, total };
}));
