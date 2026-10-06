import { NextFunction, Request, Response } from "express";
import { merge } from "lodash";
import { getUserByOpaqueSessionToken } from "./auth.token.service";
import { UserRole } from "@prisma/client";

import { verifyTelegramInitData } from './telegram-miniapp/telegram-miniapp-init-data.service';
import { findMiniAppIdentityByTelegramUserId } from './telegram-miniapp/telegram-miniapp-identity.service';

const cookieName = () => process.env.COOKIE_NAME || 'ddc_refresh';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    const initData = req.header('x-telegram-init-data');
    if (initData !== undefined) {
        const token = process.env.TELEGRAM_TOKEN?.trim();
        const verified = token && verifyTelegramInitData(initData, token);
        if (!verified || !verified.ok) return res.status(401).json({ message: 'Unauthorized' });
        const identity = await findMiniAppIdentityByTelegramUserId(verified.telegramUserId);
        if (!identity?.user.isEnabled || identity.user.role !== UserRole.ADMIN) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        req.user = identity.user;
        req.authMethod = 'telegram-miniapp';
        return next();
    }
    const sessionToken = req.cookies[cookieName()];

    if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const session = await getUserByOpaqueSessionToken(sessionToken)
        if (!session?.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        merge(req, { user: session.user, token: sessionToken });

        return next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => unknown;

export const asyncHandler = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


export const requireRole = (...roles: UserRole[]) => (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};

export const requireOwnerOrRole = (...roles: UserRole[]) => (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const targetUserId = Number(req.params.id);
    if (!req.user || !Number.isInteger(targetUserId)) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    if (req.user.id !== targetUserId && !roles.includes(req.user.role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};

export const isToken = isAuthenticated;
