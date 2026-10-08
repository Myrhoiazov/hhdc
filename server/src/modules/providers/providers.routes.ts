import { Router, Request } from 'express';
import prisma from '../../../prisma/prisma-client';
import { entityId, listRoute, route, normalizePagination } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { createAuditLog, extractAuditContext } from '../audit/audit.service';
import { syncEmailConnection } from '../communications/sync';
import { createConnection, deleteConnection, testConnection, updateConnection } from './connection.service';
import { checkWeeztixConnection, completeWeeztixAuthorization, connectSchema, startWeeztixAuthorization } from '../ticketing/weeztix-connection.service';
import { syncWeeztixCatalog } from '../ticketing/weeztix-catalog.service';
import { syncWeeztixSales } from '../ticketing/weeztix-orders.service';
import { importContactsSchema, importWeeztixContacts } from '../ticketing/weeztix-contacts.service';
import { providerSchema, safeProviderSelect } from './providers.service';

export const providersRouter = Router();

const audit = (req: Request, action: string, id: string, change: { before?: unknown; after?: unknown } = {}) =>
    createAuditLog({ action, entityType: 'ProviderConnection', entityId: id, ...change }, extractAuditContext(req));

providersRouter.get('/', permitted('providers.read'), listRoute(async req => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.providerConnection.findMany({ skip, take: pageSize, orderBy: { createdAt: 'asc' }, select: safeProviderSelect }),
        prisma.providerConnection.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
}));

providersRouter.post('/', permitted('providers.manage'), route(async req => {
    const provider = await createConnection(providerSchema.parse(req.body));
    await audit(req, 'PROVIDER_CREATED', provider.id, { after: provider });
    return provider;
}));

// Weeztix is connected through its own sign-in instead of typed credentials: the staff member
// approves access in Weeztix and brings back the address they were returned to.
providersRouter.post('/weeztix/authorize', permitted('providers.manage'), route(async req => startWeeztixAuthorization(currentUser(req).id)));

providersRouter.post('/weeztix/connect', permitted('providers.manage'), route(async req => {
    const provider = await completeWeeztixAuthorization(connectSchema.parse(req.body), currentUser(req).id);
    await audit(req, 'PROVIDER_CONNECTED', provider.id, { after: provider });
    return provider;
}));

providersRouter.post('/:id/weeztix-check', permitted('providers.manage'), route(async req => {
    const result = await checkWeeztixConnection(entityId(req));
    await audit(req, result.success ? 'PROVIDER_TEST_SUCCEEDED' : 'PROVIDER_TEST_FAILED', result.provider.id);
    return result;
}));

// Buyers of Weeztix orders → people. Without `dryRun: false` it only reports what would happen.
providersRouter.post('/:id/weeztix-contacts', permitted('people.import'), route(async req => {
    const id = entityId(req);
    const result = await importWeeztixContacts(id, importContactsSchema.parse(req.body ?? {}));
    if (!result.dryRun) await audit(req, 'WEEZTIX_CONTACTS_IMPORTED', id, { after: result });
    return result;
}));

// Events and ticket types with prices → the CRM.
providersRouter.post('/:id/weeztix-catalog', permitted('ticketing.sync'), route(async req => {
    const id = entityId(req);
    const result = await syncWeeztixCatalog(id);
    await audit(req, 'WEEZTIX_CATALOG_SYNCED', id, { after: result });
    return result;
}));

// Orders, tickets and payments → the CRM, after refreshing events and prices they refer to.
providersRouter.post('/:id/weeztix-sales', permitted('ticketing.sync'), route(async req => {
    const id = entityId(req);
    const result = await syncWeeztixSales(id);
    await audit(req, 'WEEZTIX_SALES_SYNCED', id, { after: result });
    return result;
}));

providersRouter.patch('/:id', permitted('providers.manage'), route(async req => {
    const { before, provider } = await updateConnection(entityId(req), providerSchema.partial().parse(req.body));
    await audit(req, 'PROVIDER_UPDATED', provider.id, { before, after: provider });
    return provider;
}));

providersRouter.post('/:id/test', permitted('providers.manage'), route(async req => {
    const result = await testConnection(entityId(req));
    await audit(req, result.success ? 'PROVIDER_TEST_SUCCEEDED' : 'PROVIDER_TEST_FAILED', result.provider.id);
    return result;
}));

providersRouter.post('/:id/sync', permitted('providers.manage'), route(async req => {
    const id = entityId(req);
    const result = await syncEmailConnection(id);
    await audit(req, 'PROVIDER_SYNC_REQUESTED', id, { after: result });
    return result;
}));

providersRouter.delete('/:id', permitted('providers.manage'), route(async req => {
    const deleted = await deleteConnection(entityId(req));
    await audit(req, 'PROVIDER_DELETED', deleted.id);
    return deleted;
}));
