import { Request, Response } from 'express';
import { get } from "lodash";
import { AuthSecurityEventType } from '@prisma/client';
import { IUserAttributes } from '../users/users.types';
import { updateUser, getUserWithCredentials, updateUserPassword } from '../users/users.service';
import { hashPassword, isCommonPassword, isPasswordAllowed, verifyPassword } from './auth.password.service';
import { recordAuthSecurityEvent } from './auth.security-audit.service';
import { listUserSessions, revokeOtherUserSessions, revokeUserSession } from './auth.token.service';

type ProfileResponse = Omit<IUserAttributes, 'password' | 'salt'>;

export const getProfile = async (req: Request, res: Response) => {
    const currentUser = get(req, "user", null);

    if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { id, firstName, lastName, email, role, isActive, isEnabled, lastLogin } = currentUser;

    const data: ProfileResponse = {
        id,
        firstName,
        lastName,
        email,
        role,
        isActive,
        isEnabled,
        lastLogin,
    };

    return res.json(data);
}

const changeUserPassword = async (
    userId: number,
    currentPassword: string,
    newPassword: string,
): Promise<{
    error: number | null;
    message?: string;
}> => {
    const user = await getUserWithCredentials(userId);
    if (!user) {
        return { error: 404, message: 'User not found' };
    }

    const passwordCheck = await verifyPassword(user.password, user.salt, currentPassword);
    if (!passwordCheck.valid) {
        return { error: 400, message: 'Current password is incorrect' };
    }

    const hashedNewPassword = await hashPassword(newPassword);
    await updateUserPassword(userId, hashedNewPassword, null);
    return { error: null };
};

const recordPasswordChangeAudit = async (
    req: Request,
    currentUserId: number,
    userId: number,
    byAdmin: boolean,
) => {
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.PASSWORD_CHANGED,
        actorUserId: currentUserId,
        targetUserId: userId,
        req,
        metadata: { byAdmin },
    });
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_REVOKED,
        actorUserId: currentUserId,
        targetUserId: userId,
        req,
        metadata: { reason: 'PASSWORD_CHANGED' },
    });
};

export const changePasswordController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { currentPassword, newPassword } = req.body;
    const currentUser = get(req, "user", null) as any;

    if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    if (!isPasswordAllowed(newPassword)) {
        return res.status(400).json({ message: 'Пароль должен содержать от 12 до 128 символов' });
    }
    if (isCommonPassword(newPassword)) {
        return res.status(400).json({ message: 'Этот пароль слишком распространён. Выберите другой пароль' });
    }

    if (String(currentUser.id) !== String(userId) && currentUser.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const result = await changeUserPassword(userId, currentPassword, newPassword);
        if (result.error) {
            return res.status(result.error).json({ message: result.message });
        }

        await recordPasswordChangeAudit(req, Number(currentUser.id), userId, String(currentUser.id) !== String(userId));

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateProfileController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { firstName, lastName, email } = req.body;

    if (!userId || !firstName || !email) {
        return res.status(400).json({ message: 'User ID, name, and email are required' });
    }

    try {
        const currentEmail = req.user?.id === userId ? req.user.email : undefined;
        const nextEmail = String(email).trim().toLowerCase();
        const updatedUser = await updateUser(userId, {
            firstName,
            email: nextEmail,
            lastName,
        });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (currentEmail && currentEmail !== nextEmail) {
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.SESSION_REVOKED,
                actorUserId: Number(req.user?.id),
                targetUserId: userId,
                req,
                metadata: { reason: 'EMAIL_CHANGED', previousEmail: currentEmail, nextEmail },
            });
        }
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const listSessionsController = async (req: Request, res: Response) => {
    const currentUser = get(req, "user", null) as any;
    const currentSessionToken = get(req, "token", null) as string | null;

    if (!currentUser || !currentSessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await listUserSessions(Number(currentUser.id), currentSessionToken);
    return res.status(200).json({ data: sessions });
};

export const revokeSessionController = async (req: Request, res: Response) => {
    const currentUser = get(req, "user", null) as any;
    const sessionId = Number(req.params.sessionId);

    if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({ message: "Session ID is required" });
    }

    const revoked = await revokeUserSession(Number(currentUser.id), sessionId);
    if (!revoked) {
        return res.status(404).json({ message: "Session not found" });
    }

    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_REVOKED,
        actorUserId: Number(currentUser.id),
        targetUserId: Number(currentUser.id),
        req,
        metadata: { reason: 'USER_REVOKED_SESSION', sessionId },
    });

    return res.status(200).json({ message: "Session revoked" });
};

export const revokeOtherSessionsController = async (req: Request, res: Response) => {
    const currentUser = get(req, "user", null) as any;
    const currentSessionToken = get(req, "token", null) as string | null;

    if (!currentUser || !currentSessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await revokeOtherUserSessions(Number(currentUser.id), currentSessionToken);
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_REVOKED,
        actorUserId: Number(currentUser.id),
        targetUserId: Number(currentUser.id),
        req,
        metadata: { reason: 'USER_REVOKED_OTHER_SESSIONS', count: result.count },
    });

    return res.status(200).json({ message: "Other sessions revoked", count: result.count });
};
