import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { permitted, currentUser } from '../auth/auth.middleware';
import { ApiError, entityId, listRoute, route } from '../../common/http';
import { normalizePagination } from '../../common/http';

export const viewsRouter = Router();

const viewSchema = z.object({
    name: z.string().min(1),
    entityType: z.string().min(1),
    columns: z.any(),
    sort: z.any().optional().nullable(),
    filterDsl: z.any().optional().nullable(),
});

viewsRouter.get('/', permitted('communications.read'), listRoute(async req => {
    const user = currentUser(req);
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.savedView.findMany({ where: { userId: user.id }, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.savedView.count({ where: { userId: user.id } }),
    ]);
    return { data, meta: { page, pageSize, total } };
}));

viewsRouter.get('/:id', permitted('communications.read'), route(async req => {
    const user = currentUser(req);
    const data = await prisma.savedView.findFirst({ where: { id: entityId(req), userId: user.id } });
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Saved view not found');
    return data;
}));

viewsRouter.post('/', permitted('communications.write'), route(async req => {
    const user = currentUser(req);
    const input = viewSchema.parse(req.body);
    return prisma.savedView.create({ data: {
        userId: user.id,
        name: input.name,
        entityType: input.entityType,
        columns: input.columns || {},
        sort: input.sort || {},
        filterDsl: input.filterDsl || {}
    } });
}));

viewsRouter.patch('/:id', permitted('communications.write'), route(async req => {
    const user = currentUser(req);
    const input = viewSchema.partial().parse(req.body);
    const data: any = { ...input };
    return prisma.savedView.update({ where: { id: entityId(req), userId: user.id }, data });
}));

viewsRouter.delete('/:id', permitted('communications.write'), route(async req => {
    const user = currentUser(req);
    await prisma.savedView.delete({ where: { id: entityId(req), userId: user.id } });
    return { success: true };
}));
