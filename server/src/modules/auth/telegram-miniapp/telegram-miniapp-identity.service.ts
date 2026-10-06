import { AuthProvider, Prisma } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';

export const findMiniAppIdentityByTelegramUserId = (telegramUserId: string) => prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider: AuthProvider.TELEGRAM_MINIAPP, providerUserId: telegramUserId } },
    include: { user: true },
});

export type LinkMiniAppIdentityResult =
    | { ok: true }
    | { ok: false; reason: 'USER_ALREADY_LINKED' | 'IDENTITY_ALREADY_LINKED' };

interface LinkMiniAppIdentityInput {
    userId: number;
    telegramUserId: string;
    username?: string;
    displayName?: string;
}

export const linkMiniAppIdentity = async (input: LinkMiniAppIdentityInput): Promise<LinkMiniAppIdentityResult> => {
    try {
        return await prisma.$transaction(async (tx) => {
            // Serialize links for this CRM user; the provider/id unique index separately
            // protects against different users claiming the same Telegram account.
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
            const existing = await tx.authIdentity.findFirst({
                where: { userId: input.userId, provider: AuthProvider.TELEGRAM_MINIAPP },
            });
            if (existing) return { ok: false, reason: 'USER_ALREADY_LINKED' };
            await tx.authIdentity.create({
                data: {
                    userId: input.userId,
                    provider: AuthProvider.TELEGRAM_MINIAPP,
                    providerUserId: input.telegramUserId,
                    username: input.username ?? null,
                    displayName: input.displayName ?? null,
                },
            });
            return { ok: true };
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { ok: false, reason: 'IDENTITY_ALREADY_LINKED' };
        }
        throw error;
    }
};
