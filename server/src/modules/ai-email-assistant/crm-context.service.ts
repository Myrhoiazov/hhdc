import prisma from '../../../prisma/prisma-client';
import type { CrmContactProjection, CrmReader } from './draft.service';

type CrmClientLookup = {
    findFirst(args: {
        where: { email: string };
        select: { id: true; email: true; firstName: true; lastName: true; expiresAt: true };
    }): Promise<{ id: number; email: string | null; firstName: string | null; lastName: string | null; expiresAt: Date | null } | null>;
};

export const createPrismaCrmReader = (client: CrmClientLookup = prisma.client): CrmReader => ({
    async findContactByEmail(email): Promise<CrmContactProjection | null> {
        const contact = await client.findFirst({
            where: { email },
            select: { id: true, email: true, firstName: true, lastName: true, expiresAt: true },
        });
        if (!contact?.email) return null;
        return {
            id: contact.id,
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            status: contact.expiresAt && contact.expiresAt < new Date() ? 'expired' : 'active',
        };
    },
});
