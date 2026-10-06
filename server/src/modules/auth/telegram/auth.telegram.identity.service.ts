import { AuthProvider, Prisma } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import { TelegramIdentity } from './auth.telegram.oidc-client';

const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';

export const findTelegramIdentityByProviderUserId = (providerUserId: string) => prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider: AuthProvider.TELEGRAM, providerUserId } },
    include: { user: true },
});

export const findTelegramIdentityByUserId = (userId: number) => prisma.authIdentity.findFirst({
    where: { userId, provider: AuthProvider.TELEGRAM },
});

export type LinkTelegramIdentityFailureReason = 'USER_ALREADY_LINKED' | 'IDENTITY_ALREADY_LINKED';
export type LinkTelegramIdentityResult =
    | { ok: true; identity: Prisma.AuthIdentityGetPayload<{}> }
    | { ok: false; reason: LinkTelegramIdentityFailureReason };

interface LinkTelegramIdentityInput extends TelegramIdentity {
    userId: number;
}

// At most one Telegram identity per CRM user — a service-layer rule (per spec
// section 4: "unless existing product requirements explicitly require
// otherwise"), not a DB constraint, so it stays easy to relax later without a
// migration. The DB unique index on [provider, providerUserId] is the one
// invariant that's load-bearing: it's the actual defense against two users
// racing to link the same Telegram identity, which a pre-insert SELECT alone
// cannot guarantee (spec section 14).
export const linkTelegramIdentity = async ({
    userId,
    providerUserId,
    username,
    displayName,
}: LinkTelegramIdentityInput): Promise<LinkTelegramIdentityResult> => {
    const existingForUser = await findTelegramIdentityByUserId(userId);
    if (existingForUser) {
        return { ok: false, reason: 'USER_ALREADY_LINKED' };
    }

    try {
        const identity = await prisma.authIdentity.create({
            data: {
                userId,
                provider: AuthProvider.TELEGRAM,
                providerUserId,
                username,
                displayName,
            },
        });
        return { ok: true, identity };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR) {
            return { ok: false, reason: 'IDENTITY_ALREADY_LINKED' };
        }
        throw error;
    }
};

export const touchTelegramIdentityLastLogin = (identityId: number) => prisma.authIdentity.update({
    where: { id: identityId },
    data: { lastLoginAt: new Date() },
});

export const unlinkTelegramIdentity = async (userId: number) => {
    const result = await prisma.authIdentity.deleteMany({
        where: { userId, provider: AuthProvider.TELEGRAM },
    });
    return result.count > 0;
};
