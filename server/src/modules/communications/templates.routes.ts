import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { permitted, currentUser } from '../auth/auth.middleware';
import { ApiError, entityId, listRoute, route } from '../../common/http';
import { normalizePagination } from '../../common/http';

export const templatesRouter = Router();

const templateSchema = z.object({
    name: z.string().min(1),
    subject: z.string().min(1),
    bodyHtml: z.string().min(1),
    bodyText: z.string().optional().nullable(),
});

templatesRouter.get('/', permitted('communications.read'), listRoute(async req => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.communicationTemplate.findMany({ skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.communicationTemplate.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
}));

templatesRouter.get('/:id', permitted('communications.read'), route(async req => {
    const data = await prisma.communicationTemplate.findUnique({ where: { id: entityId(req) } });
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Template not found');
    return data;
}));

templatesRouter.post('/', permitted('communications.write'), route(async req => {
    const input = templateSchema.parse(req.body);
    return prisma.communicationTemplate.create({ data: input as any });
}));

templatesRouter.patch('/:id', permitted('communications.write'), route(async req => {
    const input = templateSchema.partial().parse(req.body);
    return prisma.communicationTemplate.update({ where: { id: entityId(req) }, data: input as any });
}));

templatesRouter.delete('/:id', permitted('communications.write'), route(async req => {
    await prisma.communicationTemplate.delete({ where: { id: entityId(req) } });
    return { success: true };
}));
