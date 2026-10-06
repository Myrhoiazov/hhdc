import { findTelegramIdentityByProviderUserId } from '../auth/telegram/auth.telegram.identity.service';

// Bot-side equivalent of auth/auth.middleware.ts's requireRole — there is no HTTP request here
// to hang req.user off, so this resolves straight from the Telegram numeric user id to a CRM
// User via the same AuthIdentity link Telegram OIDC login already creates (see
// auth.telegram.identity.service.ts). No second CRM<->Telegram linking mechanism is introduced.
export interface ResolvedTelegramAdmin {
    userId: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
}

type IdentityLookup = typeof findTelegramIdentityByProviderUserId;

// Gated to ADMIN only for the whole bot (dashboard included) — this is a brand-new access
// surface for financial actions, and applying one uniform rule avoids a partial-role special
// case for v1 (see tasks/plan.md "Telegram Admin Bot" decision 4).
export const resolveTelegramAdmin = async (
    telegramUserId: string,
    lookup: IdentityLookup = findTelegramIdentityByProviderUserId,
): Promise<ResolvedTelegramAdmin | null> => {
    const identity = await lookup(telegramUserId);
    const user = identity?.user;
    if (!user || !user.isEnabled || user.role !== 'ADMIN') return null;
    return {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
    };
};
