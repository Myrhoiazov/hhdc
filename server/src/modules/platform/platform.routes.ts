import { Request, Router } from 'express';
import { DuplicateStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError, entityId, listRoute, normalizePagination, route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { auditData } from '../audit/audit.service';
import { safeEndpointSelect, createWebhookEndpoint, requireEndpoint, webhookEndpointSchema } from '../webhooks/webhooks.service';
import { eventAnalytics } from './analytics.service';
import { generateApiKey } from './api-keys';
import { CUSTOM_FIELD_ENTITIES, definitionSchema, validateCustomValue } from './custom-fields';
import { KNOWN_FLAGS } from './feature-flags';
import { EXPORT_ENTITIES, createExport, importPeople, importSchema } from './import-export.service';
import { mergePeople, mergeSchema, previewMerge, scanDuplicates } from './merge.service';

const personBrief = { id: true, displayName: true, email: true, phone: true };

const listDuplicates = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const where = { status: z.nativeEnum(DuplicateStatus).default('PENDING').parse(req.query.status) };
    const [candidates, total] = await prisma.$transaction([
        prisma.duplicateCandidate.findMany({ where, skip, take: pageSize, orderBy: { score: 'desc' } }),
        prisma.duplicateCandidate.count({ where }),
    ]);
    const people = await prisma.person.findMany({ where: { id: { in: candidates.flatMap(item => [item.personAId, item.personBId]) } }, select: personBrief });
    const byId = new Map(people.map(person => [person.id, person]));
    return { data: candidates.map(item => ({ ...item, personA: byId.get(item.personAId), personB: byId.get(item.personBId) })), meta: { page, pageSize, total } };
};

const resolveDuplicate = async (req: Request) => {
    const { status } = z.object({ status: z.enum(['NOT_DUPLICATE', 'IGNORED']) }).strict().parse(req.body);
    return prisma.duplicateCandidate.update({ where: { id: entityId(req), status: 'PENDING' }, data: { status, resolvedAt: new Date(), resolvedBy: currentUser(req).id } });
};

const merge = (req: Request) => {
    const input = mergeSchema.parse(req.body);
    return mergePeople({ targetId: entityId(req), sourceId: input.sourcePersonId, fieldDecisions: input.fieldDecisions, actorUserId: currentUser(req).id });
};

const customFieldEntity = z.enum(CUSTOM_FIELD_ENTITIES);
const saveCustomValues = async (req: Request) => {
    const params = z.object({ entityType: customFieldEntity, entityId: z.string().uuid() }).parse(req.params);
    const values = z.record(z.unknown()).parse(req.body);
    const definitions = await prisma.customFieldDefinition.findMany({ where: { entityType: params.entityType, active: true } });
    const unknown = Object.keys(values).filter(key => !definitions.some(definition => definition.key === key));
    if (unknown.length) throw new ApiError(400, 'UNKNOWN_CUSTOM_FIELD', `Unknown fields: ${unknown.join(', ')}`);
    const validated = definitions.filter(definition => definition.key in values).map(definition => {
        try { return { definition, value: validateCustomValue(definition, values[definition.key]) }; }
        catch (error) { throw new ApiError(400, 'INVALID_CUSTOM_FIELD', error instanceof Error ? error.message : 'Invalid value'); }
    });
    await prisma.$transaction(validated.map(({ definition, value }) => prisma.customFieldValue.upsert({
        where: { definitionId_entityId: { definitionId: definition.id, entityId: params.entityId } },
        create: { definitionId: definition.id, entityType: params.entityType, entityId: params.entityId, value: value as Prisma.InputJsonValue ?? Prisma.JsonNull },
        update: { value: value as Prisma.InputJsonValue ?? Prisma.JsonNull },
    })));
    return prisma.customFieldValue.findMany({ where: params, include: { definition: { select: { key: true, label: true, type: true } } } });
};

const CONSENT_TYPES = ['MARKETING_EMAIL', 'MARKETING_SMS', 'PHOTO_VIDEO', 'TERMS', 'OTHER'] as const;
const consentSchema = z.object({ type: z.enum(CONSENT_TYPES), status: z.enum(['GRANTED', 'WITHDRAWN']), source: z.string().trim().min(1).max(100).default('STAFF') }).strict();
const saveConsent = async (req: Request) => {
    const personId = entityId(req);
    const input = consentSchema.parse(req.body);
    const state = { status: input.status, source: input.source, withdrawnAt: input.status === 'WITHDRAWN' ? new Date() : null };
    return prisma.$transaction(async tx => {
        const consent = await tx.consent.upsert({ where: { personId_type: { personId, type: input.type } }, create: { personId, type: input.type, ...state }, update: { ...state, ...(input.status === 'GRANTED' ? { capturedAt: new Date() } : {}) } });
        await tx.auditLog.create({ data: { ...auditData(req, `CONSENT_${input.status}`, 'Person', personId), after: { type: input.type } } });
        return consent;
    });
};

const apiKeySchema = z.object({ name: z.string().trim().min(1).max(200), permissions: z.array(z.string().regex(/^[a-z]+(\.[a-z]+)+$/)).min(1).max(50), expiresAt: z.coerce.date().optional() }).strict();
const safeApiKeySelect = { id: true, name: true, prefix: true, permissions: true, status: true, lastUsedAt: true, expiresAt: true, createdAt: true };
const createApiKey = async (req: Request) => {
    const input = apiKeySchema.parse(req.body);
    const user = currentUser(req);
    const escalated = input.permissions.filter(permission => !user.permissions.includes(permission));
    if (escalated.length) throw new ApiError(403, 'PERMISSION_ESCALATION', 'A key cannot hold permissions you do not have');
    const { key, prefix, keyHash } = generateApiKey();
    return prisma.$transaction(async tx => {
        const apiKey = await tx.apiKey.create({ data: { name: input.name, permissions: input.permissions, expiresAt: input.expiresAt, prefix, keyHash, createdBy: user.id }, select: safeApiKeySelect });
        await tx.auditLog.create({ data: auditData(req, 'API_KEY_CREATED', 'ApiKey', apiKey.id) });
        return { ...apiKey, key };
    });
};
const revokeApiKey = (req: Request) => prisma.$transaction(async tx => {
    const apiKey = await tx.apiKey.update({ where: { id: entityId(req) }, data: { status: 'REVOKED' }, select: safeApiKeySelect });
    await tx.auditLog.create({ data: auditData(req, 'API_KEY_REVOKED', 'ApiKey', apiKey.id) });
    return apiKey;
});

const setFlag = async (req: Request) => {
    const key = z.enum(KNOWN_FLAGS).parse(req.params.key);
    const { enabled } = z.object({ enabled: z.boolean() }).strict().parse(req.body);
    return prisma.$transaction(async tx => {
        const flag = await tx.featureFlag.upsert({ where: { key }, create: { key, enabled }, update: { enabled } });
        await tx.auditLog.create({ data: { actorUserId: currentUser(req).id, action: 'FEATURE_FLAG_CHANGED', entityType: 'FeatureFlag', after: { key, enabled } } });
        return flag;
    });
};
const listFlags = async () => {
    const stored = await prisma.featureFlag.findMany();
    return KNOWN_FLAGS.map(key => ({ key, enabled: stored.find(flag => flag.key === key)?.enabled ?? false }));
};

const brandSchema = z.object({ name: z.string().trim().min(1).max(200), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), logo: z.string().url().max(2000).optional(), defaultEmailFrom: z.string().email().optional() }).strict();
const listDeliveries = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const where = { endpointId: entityId(req) };
    const [data, total] = await prisma.$transaction([
        prisma.webhookDelivery.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, select: { id: true, eventType: true, status: true, attempts: true, responseStatus: true, lastError: true, nextRetryAt: true, createdAt: true } }),
        prisma.webhookDelivery.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
};

// Operations → Integration Health / Job Monitor: everything that failed and needs a human.
const operationsHealth = async () => {
    const since = new Date(Date.now() - 86_400_000);
    const [failedJobs, failedOutbox, pendingOutbox, failedWebhooks, failedAutomationRuns, providers] = await Promise.all([
        prisma.job.count({ where: { status: 'FAILED', createdAt: { gte: since } } }),
        prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
        prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
        prisma.webhookDelivery.count({ where: { status: 'FAILED' } }),
        prisma.automationRun.count({ where: { status: 'FAILED', startedAt: { gte: since } } }),
        prisma.providerConnection.findMany({ select: { id: true, name: true, provider: true, status: true, lastSuccessAt: true, lastFailureAt: true, lastError: true } }),
    ]);
    return { failedJobs, failedOutbox, pendingOutbox, failedWebhooks, failedAutomationRuns, providers };
};

export const platformRouter = Router();
platformRouter.get('/operations/health', permitted('operations.read'), route(operationsHealth));
platformRouter.get('/duplicates', permitted('people.write'), listRoute(listDuplicates));
platformRouter.post('/duplicates/scan', permitted('people.write'), route(scanDuplicates));
platformRouter.post('/duplicates/:id/resolve', permitted('people.write'), route(resolveDuplicate));
platformRouter.post('/people/:id/merge-preview', permitted('people.merge'), route(req => previewMerge(entityId(req), mergeSchema.parse(req.body).sourcePersonId)));
platformRouter.post('/people/:id/merge', permitted('people.merge'), route(merge));
platformRouter.get('/people/:id/consents', permitted('people.read'), route(req => prisma.consent.findMany({ where: { personId: entityId(req) } })));
platformRouter.put('/people/:id/consents', permitted('people.write'), route(saveConsent));

platformRouter.get('/custom-fields', permitted('people.read'), route(req => prisma.customFieldDefinition.findMany({ where: { entityType: customFieldEntity.optional().parse(req.query.entityType) }, orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }] })));
platformRouter.post('/custom-fields', permitted('settings.manage'), route(req => prisma.customFieldDefinition.create({ data: definitionSchema.parse(req.body) as never })));
platformRouter.get('/custom-fields/values/:entityType/:entityId', permitted('people.read'), route(req => prisma.customFieldValue.findMany({ where: z.object({ entityType: customFieldEntity, entityId: z.string().uuid() }).parse(req.params), include: { definition: { select: { key: true, label: true, type: true } } } })));
platformRouter.put('/custom-fields/values/:entityType/:entityId', permitted('people.write'), route(saveCustomValues));

platformRouter.post('/imports/people', permitted('people.import'), route(req => importPeople(importSchema.parse(req.body), currentUser(req).id)));
platformRouter.get('/exports/entities', permitted('exports.create'), route(async () => EXPORT_ENTITIES));
platformRouter.post('/exports', permitted('exports.create'), route(req => createExport(z.object({ entity: z.string().max(40) }).strict().parse(req.body).entity, currentUser(req))));

platformRouter.get('/analytics/events/:id', permitted('events.read'), route(req => eventAnalytics(entityId(req), currentUser(req).permissions.includes('finance.read'))));

platformRouter.get('/api-keys', permitted('api.manage'), route(() => prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: safeApiKeySelect })));
platformRouter.post('/api-keys', permitted('api.manage'), route(createApiKey));
platformRouter.post('/api-keys/:id/revoke', permitted('api.manage'), route(revokeApiKey));

platformRouter.get('/webhooks', permitted('webhooks.manage'), route(() => prisma.webhookEndpoint.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: safeEndpointSelect })));
platformRouter.post('/webhooks', permitted('webhooks.manage'), route(req => createWebhookEndpoint(webhookEndpointSchema.parse(req.body), currentUser(req).id)));
platformRouter.get('/webhooks/:id', permitted('webhooks.manage'), route(req => requireEndpoint(entityId(req))));
platformRouter.post('/webhooks/:id/disable', permitted('webhooks.manage'), route(req => prisma.webhookEndpoint.update({ where: { id: entityId(req) }, data: { status: 'DISABLED' }, select: safeEndpointSelect })));
platformRouter.get('/webhooks/:id/deliveries', permitted('webhooks.manage'), listRoute(listDeliveries));

platformRouter.get('/feature-flags', permitted('settings.manage'), route(listFlags));
platformRouter.put('/feature-flags/:key', permitted('settings.manage'), route(setFlag));
platformRouter.get('/brands', permitted('events.read'), route(() => prisma.brand.findMany({ orderBy: { name: 'asc' }, take: 100 })));
platformRouter.post('/brands', permitted('settings.manage'), route(req => prisma.brand.create({ data: brandSchema.parse(req.body) as never })));
