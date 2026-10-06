import { Request, Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError, entityId, listRoute, normalizePagination, route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { auditData } from '../audit/audit.service';
import { ACTION_TYPES, AutomationInput, TRIGGER_TYPES, automationSchema } from './automation.schemas';
import { parseConditions } from './conditions';
import { testAutomation } from './engine';

const include = { actions: { orderBy: { position: 'asc' as const } } };
const actionRows = (actions: AutomationInput['actions']) => actions.map((action, position) => ({ position, type: action.type, config: action.config as Prisma.InputJsonValue }));
const automationData = (input: AutomationInput) => ({
    name: input.name, triggerType: input.triggerType,
    triggerConfig: input.triggerConfig as Prisma.InputJsonValue, conditions: input.conditions as Prisma.InputJsonValue,
});

const listAutomations = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.automation.findMany({ skip, take: pageSize, orderBy: { updatedAt: 'desc' }, include }),
        prisma.automation.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
};

const requireAutomation = async (id: string) => {
    const automation = await prisma.automation.findUnique({ where: { id }, include });
    if (!automation) throw new ApiError(404, 'AUTOMATION_NOT_FOUND', 'Automation not found');
    return automation;
};

const createAutomation = async (req: Request) => {
    const input = automationSchema.parse(req.body);
    return prisma.$transaction(async tx => {
        const automation = await tx.automation.create({ data: { ...automationData(input), createdBy: currentUser(req).id, actions: { create: actionRows(input.actions) } }, include });
        await tx.auditLog.create({ data: auditData(req, 'AUTOMATION_CREATED', 'Automation', automation.id) });
        return automation;
    });
};

// Editing returns an automation to DRAFT: it must be reviewed and activated again.
const updateAutomation = async (req: Request) => {
    const id = entityId(req);
    const input = automationSchema.parse(req.body);
    await requireAutomation(id);
    return prisma.$transaction(async tx => {
        await tx.automationAction.deleteMany({ where: { automationId: id } });
        const automation = await tx.automation.update({ where: { id }, data: { ...automationData(input), status: 'DRAFT', actions: { create: actionRows(input.actions) } }, include });
        await tx.auditLog.create({ data: auditData(req, 'AUTOMATION_UPDATED', 'Automation', id) });
        return automation;
    });
};

const setStatus = (status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED', action: string) => async (req: Request) => {
    const automation = await requireAutomation(entityId(req));
    parseConditions(automation.conditions);
    return prisma.$transaction(async tx => {
        const updated = await tx.automation.update({ where: { id: automation.id }, data: { status }, include });
        await tx.auditLog.create({ data: { ...auditData(req, action, 'Automation', automation.id), before: { status: automation.status }, after: { status } } });
        return updated;
    });
};

const listRuns = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const where = { automationId: entityId(req) };
    const [data, total] = await prisma.$transaction([
        prisma.automationRun.findMany({ where, skip, take: pageSize, orderBy: { startedAt: 'desc' }, include: { actionRuns: { orderBy: { startedAt: 'asc' } } } }),
        prisma.automationRun.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
};

const runTest = (req: Request) => {
    const { payload } = z.object({ payload: z.record(z.unknown()).default({}) }).strict().parse(req.body ?? {});
    return testAutomation(entityId(req), payload);
};

export const automationsRouter = Router();
automationsRouter.get('/meta', permitted('automation.read'), route(async () => ({ triggers: TRIGGER_TYPES, actions: ACTION_TYPES })));
automationsRouter.get('/', permitted('automation.read'), listRoute(listAutomations));
automationsRouter.post('/', permitted('automation.manage'), route(createAutomation));
automationsRouter.get('/:id', permitted('automation.read'), route(req => requireAutomation(entityId(req))));
automationsRouter.put('/:id', permitted('automation.manage'), route(updateAutomation));
automationsRouter.post('/:id/test', permitted('automation.manage'), route(runTest));
automationsRouter.post('/:id/activate', permitted('automation.manage'), route(setStatus('ACTIVE', 'AUTOMATION_ENABLED')));
automationsRouter.post('/:id/pause', permitted('automation.manage'), route(setStatus('PAUSED', 'AUTOMATION_PAUSED')));
automationsRouter.post('/:id/archive', permitted('automation.manage'), route(setStatus('ARCHIVED', 'AUTOMATION_ARCHIVED')));
automationsRouter.get('/:id/runs', permitted('automation.read'), listRoute(listRuns));
