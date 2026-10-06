import { Router, Request } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { currentUser, permitted } from '../auth/auth.middleware';
import { ApiError, entityId, route } from '../../common/http';
import { normalizePagination } from '../../common/http';
import { auditData } from '../audit/audit.service';

const userSchema = z.object({ email: z.string().email().transform(value => value.toLowerCase()), name: z.string().trim().min(1).max(200), password: z.string().min(12).max(256), isActive: z.boolean().optional(), roles: z.array(z.enum(['OWNER', 'ADMIN', 'EVENT_MANAGER', 'SUPPORT', 'VIEWER'])).min(1).max(5) }).strict();
const userSelect = { id: true, email: true, name: true, isActive: true, createdAt: true, roles: { include: { role: true } } };
const createUser = async (req: Request) => {
    const { password, roles, ...input } = userSchema.parse(req.body);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    return prisma.$transaction(async tx => {
        const user = await tx.user.create({ data: { ...input, email: input.email, name: input.name, passwordHash, roles: { create: roles.map(name => ({ role: { connect: { name } } })) } }, select: userSelect });
        await tx.auditLog.create({ data: auditData(req, 'USER_CREATED', 'User', user.id) });
        return user;
    });
};
const updateUser = async (req: Request) => {
    const id = entityId(req);
    const { password, roles, ...input } = userSchema.partial().parse(req.body);
    if (id === currentUser(req).id && (input.isActive === false || roles)) throw new ApiError(409, 'SELF_ACCESS_CHANGE', 'Another administrator must change your access');
    const passwordHash = password ? await argon2.hash(password, { type: argon2.argon2id }) : undefined;
    return prisma.$transaction(async tx => {
        if (roles) await tx.userRole.deleteMany({ where: { userId: id } });
        const user = await tx.user.update({ where: { id }, data: { ...input, passwordHash, roles: roles ? { create: roles.map(name => ({ role: { connect: { name } } })) } : undefined }, select: userSelect });
        if (password || input.isActive === false) await tx.session.deleteMany({ where: { userId: id } });
        await tx.auditLog.create({ data: auditData(req, 'USER_UPDATED', 'User', id) });
        return user;
    });
};
export const adminRouter = Router();
adminRouter.get('/dashboard', permitted('dashboard.read'), route(async () => {
    const [people, events, registrations, conversations] = await prisma.$transaction([prisma.person.count(), prisma.event.count(), prisma.registration.count(), prisma.conversation.count()]);
    return { people, events, registrations, conversations };
}));
adminRouter.get('/users', permitted('users.manage'), async (req, res, next) => {
    try {
        const { page, pageSize, skip } = normalizePagination(req.query);
        const [data, total] = await prisma.$transaction([prisma.user.findMany({ skip, take: pageSize, select: userSelect }), prisma.user.count()]);
        res.json({ data, meta: { page, pageSize, total } });
    } catch (error) { next(error); }
});
adminRouter.post('/users', permitted('users.manage'), route(createUser));
adminRouter.patch('/users/:id', permitted('users.manage'), route(updateUser));
adminRouter.get('/roles', permitted('users.manage'), route(async () => prisma.role.findMany({ include: { permissions: { include: { permission: true } } } })));
adminRouter.get('/audit', permitted('audit.read'), async (req, res, next) => {
    try {
        const { page, pageSize, skip } = normalizePagination(req.query);
        const [data, total] = await prisma.$transaction([prisma.auditLog.findMany({ skip, take: pageSize, orderBy: { createdAt: 'desc' } }), prisma.auditLog.count()]);
        res.json({ data, meta: { page, pageSize, total } });
    } catch (error) { next(error); }
});
