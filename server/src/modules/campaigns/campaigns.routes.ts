import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { currentUser, permitted } from '../auth/auth.middleware';
import { previewCampaign, sendCampaign, sendCampaignTest } from './campaigns.service';
import { ApiError, entityId, listRoute, route } from '../../common/http';
import { normalizePagination } from '../../common/http';

export const campaignsRouter = Router();

const campaignSchema = z.object({
    name: z.string().min(1),
    subject: z.string().optional().nullable(),
    templateId: z.string().uuid().optional().nullable(),
    segmentId: z.string().uuid(),
    providerConnectionId: z.string().uuid().optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable(),
});

campaignsRouter.get('/', permitted('communications.read'), listRoute(async req => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.campaign.findMany({ skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { segment: true, template: true } }),
        prisma.campaign.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
}));

campaignsRouter.get('/:id', permitted('communications.read'), route(async req => {
    const data = await prisma.campaign.findUnique({ where: { id: entityId(req) }, include: { segment: true, template: true } });
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Campaign not found');
    return data;
}));

campaignsRouter.post('/', permitted('communications.write'), route(async req => {
    const input = campaignSchema.parse(req.body);
    return prisma.campaign.create({ data: input as any });
}));

campaignsRouter.patch('/:id', permitted('communications.write'), route(async req => {
    const input = campaignSchema.partial().parse(req.body);
    return prisma.campaign.update({ where: { id: entityId(req) }, data: input as any });
}));

campaignsRouter.delete('/:id', permitted('communications.write'), route(async req => {
    await prisma.campaign.delete({ where: { id: entityId(req) } });
    return { success: true };
}));

// Actions
campaignsRouter.post('/:id/preview', permitted('campaigns.read'), route(req => previewCampaign(entityId(req))));

campaignsRouter.post('/:id/test', permitted('campaigns.send'), route(req => sendCampaignTest(entityId(req), currentUser(req).email)));

campaignsRouter.post('/:id/schedule', permitted('campaigns.send'), route(async req => {
    const input = z.object({ scheduledAt: z.string().datetime() }).parse(req.body);
    return prisma.campaign.update({ where: { id: entityId(req), status: 'DRAFT' }, data: { scheduledAt: input.scheduledAt, status: 'SCHEDULED' } });
}));

// Bulk send requires the caller to confirm the recipient count shown by the preview.
campaignsRouter.post('/:id/send', permitted('campaigns.send'), route(req => {
    const { confirmRecipientCount } = z.object({ confirmRecipientCount: z.number().int().positive() }).strict().parse(req.body);
    return sendCampaign({ id: entityId(req), actorUserId: currentUser(req).id, confirmRecipientCount });
}));

campaignsRouter.get('/:id/deliveries', permitted('campaigns.read'), listRoute(async req => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const where = { campaignId: entityId(req) };
    const [data, total] = await prisma.$transaction([
        prisma.deliveryLog.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.deliveryLog.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
}));
