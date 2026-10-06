import { Router, Request } from 'express';
import prisma from '../../../prisma/prisma-client';
import { ApiError, entityId, route, normalizePagination } from '../../common/http';
import { permitted } from '../auth/auth.middleware';
import { createAuditLog, extractAuditContext } from '../audit/audit.service';
import { providerSchema, validateProviderType, encryptCredentials, safeProviderSelect } from './providers.service';

export const providersRouter = Router();

providersRouter.get('/', permitted('providers.read'), async (req, res, next) => {
    try {
        const { page, pageSize, skip } = normalizePagination(req.query);
        const [data, total] = await prisma.$transaction([
            prisma.providerConnection.findMany({ skip, take: pageSize, select: safeProviderSelect }),
            prisma.providerConnection.count()
        ]);
        res.json({ data, meta: { page, pageSize, total } });
    } catch (error) { 
        next(error); 
    }
});

providersRouter.post('/', permitted('providers.manage'), route(async (req: Request) => {
    const { credentials, ...input } = providerSchema.parse(req.body);
    validateProviderType(input.provider, input.type);
    
    return prisma.$transaction(async tx => {
        const provider = await tx.providerConnection.create({ 
            data: { 
                ...input, 
                name: input.name, 
                provider: input.provider, 
                type: input.type, 
                credentialsEncrypted: credentials ? encryptCredentials(credentials) : undefined 
            }, 
            select: safeProviderSelect 
        });
        
        await createAuditLog({
            action: 'PROVIDER_CREATED',
            entityType: 'ProviderConnection',
            entityId: provider.id,
            after: provider,
        }, extractAuditContext(req), tx);
        
        return provider;
    });
}));

providersRouter.patch('/:id', permitted('providers.manage'), route(async (req: Request) => {
    const id = entityId(req);
    const { credentials, ...input } = providerSchema.partial().parse(req.body);
    
    const existing = await prisma.providerConnection.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Provider not found');
    
    validateProviderType(input.provider ?? existing.provider, input.type ?? existing.type);
    
    return prisma.$transaction(async tx => {
        const provider = await tx.providerConnection.update({ 
            where: { id }, 
            data: { 
                ...input, 
                credentialsEncrypted: credentials ? encryptCredentials(credentials) : undefined 
            }, 
            select: safeProviderSelect 
        });
        
        await createAuditLog({
            action: 'PROVIDER_UPDATED',
            entityType: 'ProviderConnection',
            entityId: id,
            before: existing,
            after: provider,
        }, extractAuditContext(req), tx);
        
        return provider;
    });
}));
