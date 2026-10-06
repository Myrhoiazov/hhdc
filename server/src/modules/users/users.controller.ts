import { z } from 'zod';
import { linkMiniAppIdentity } from '../auth/telegram-miniapp/telegram-miniapp-identity.service';
import { Request, Response } from 'express';
import {
    createUser,
    deleteUserById,
    getAllUsers,
    getUserByEmail,
    getUserById,
    updateUserSecurity,
} from './users.service';
import ApiError from '../../common/errors/api-error';

import { hashPassword, isCommonPassword, isPasswordAllowed } from '../auth/auth.password.service';
import { AuthSecurityEventType, UserRole } from '@prisma/client';
import { recordAuthSecurityEvent } from '../auth/auth.security-audit.service';
import { notifyRoleChanged } from '../communication';

/**
 * Controller to fetch all users.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with users or error message
 */
export const gettAllUsersController = async (req: Request, res: Response) => {
    try {
        const users = await getAllUsers();
        return res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
/**
 * Controller to delete a user by ID.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with status or error message
 */
export const deleteUserByIdController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    if (req.user?.id === userId) {
        return res.status(400).json({ message: 'Нельзя удалить собственный аккаунт' });
    }

    try {
        const deleteUser = await deleteUserById(userId);
        if (!deleteUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.ACCOUNT_DELETED,
            actorUserId: req.user?.id,
            targetUserId: deleteUser.id,
            req,
            metadata: { email: deleteUser.email, role: deleteUser.role },
        });
        return res.status(200).json(deleteUser);
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const recordRoleChangeAudit = async (
    req: Request,
    userId: number,
    targetEmail: string,
    previousRole: UserRole,
    nextRole: UserRole,
) => {
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.ROLE_CHANGED,
        actorUserId: req.user?.id,
        targetUserId: userId,
        req,
        metadata: { from: previousRole, to: nextRole },
    });
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_REVOKED,
        actorUserId: req.user?.id,
        targetUserId: userId,
        req,
        metadata: { reason: 'ROLE_CHANGED' },
    });
    void notifyRoleChanged({
        targetEmail,
        actorEmail: req.user?.email,
        fromRole: previousRole,
        toRole: nextRole,
    }).catch((error) => console.error('Failed to send role-changed Telegram notification:', error));
};

const recordEnabledChangeAudit = async (req: Request, userId: number, previousEnabled: boolean, nextEnabled: boolean) => {
    await recordAuthSecurityEvent({
        type: nextEnabled
            ? AuthSecurityEventType.ACCOUNT_ENABLED
            : AuthSecurityEventType.ACCOUNT_DISABLED,
        actorUserId: req.user?.id,
        targetUserId: userId,
        req,
        metadata: { previous: previousEnabled, current: nextEnabled },
    });
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_REVOKED,
        actorUserId: req.user?.id,
        targetUserId: userId,
        req,
        metadata: { reason: nextEnabled ? 'ACCOUNT_ENABLED' : 'ACCOUNT_DISABLED' },
    });
};

export const validateUpdateUserRequest = (
    req: Request,
    userId: number,
    role: UserRole | undefined,
    isEnabled: boolean | undefined,
): string | null => {
    if (!userId || (role === undefined && isEnabled === undefined)) {
        return 'Role or account state is required';
    }
    if (role !== undefined && !Object.values(UserRole).includes(role)) {
        return 'Invalid role';
    }
    if (isEnabled !== undefined && typeof isEnabled !== 'boolean') {
        return 'Invalid account state';
    }
    if (req.user?.id === userId && isEnabled === false) {
        return 'Нельзя заблокировать собственный аккаунт';
    }
    if (req.user?.id === userId && role !== undefined && role !== req.user.role) {
        return 'Нельзя изменить собственную роль';
    }
    return null;
};

export const updateUserController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { role, isEnabled } = req.body;

    const validationError = validateUpdateUserRequest(req, userId, role, isEnabled);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const previousUser = await getUserById(userId);
        if (!previousUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const updatedUser = await updateUserSecurity(userId, { role, isEnabled });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (role !== undefined && role !== previousUser.role) {
            await recordRoleChangeAudit(req, userId, previousUser.email, previousUser.role, role);
        }
        if (isEnabled !== undefined && isEnabled !== previousUser.isEnabled) {
            await recordEnabledChangeAudit(req, userId, previousUser.isEnabled, isEnabled);
        }
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const getUserByIdController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const User = await getUserById(userId);
        if (!User) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { authVersion: _authVersion, ...safeUser } = User;
        return res.status(200).json(safeUser);
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }

}

export const createUserController = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, role } = req.body;



    if (!firstName || !email || !password) {
        throw ApiError.BadRequest('All fields are required');
    }
    if (!isPasswordAllowed(password)) {
        throw ApiError.BadRequest('Пароль должен содержать от 12 до 128 символов');
    }
    if (isCommonPassword(password)) {
        throw ApiError.BadRequest('Этот пароль слишком распространён. Выберите другой пароль');
    }

    try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await getUserByEmail(normalizedEmail);
        if (existingUser) {
            throw ApiError.BadRequest('User already exists');
        }

        const hashedPassword = await hashPassword(password);
        const newUser = await createUser({
            firstName,
            role,
            lastName,
            salt: null,
            email: normalizedEmail,
            password: hashedPassword,
            isEnabled: true,
        });

        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.ACCOUNT_CREATED,
            actorUserId: req.user?.id,
            targetUserId: newUser.id,
            req,
            metadata: { email: newUser.email, role: newUser.role },
        });

        return res.status(201).json(newUser);
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

const linkTelegramMiniAppSchema = z.object({
    telegramUserId: z.string().trim().regex(/^[1-9]\d*$/, 'Telegram id must be numeric')
        .refine((value) => Number.isSafeInteger(Number(value)), 'Invalid Telegram id'),
});

export const linkTelegramMiniAppController = async (req: Request, res: Response) => {
    const targetUserId = Number(req.params.id);
    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    const parsed = linkTelegramMiniAppSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Проверьте Telegram id', details: parsed.error.flatten() });
    }
    const target = await getUserById(targetUserId);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (!target.isEnabled || target.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const result = await linkMiniAppIdentity({ userId: targetUserId, telegramUserId: parsed.data.telegramUserId });
    if (result.ok === false) {
        return res.status(409).json({ message: result.reason === 'USER_ALREADY_LINKED'
            ? 'У пользователя уже привязан Telegram Mini App'
            : 'Telegram аккаунт уже привязан к другому пользователю' });
    }
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.TELEGRAM_LINKED,
        actorUserId: req.user?.id,
        targetUserId,
        metadata: { provider: 'TELEGRAM_MINIAPP' },
        req,
    });
    return res.status(200).json({ message: 'Telegram Mini App привязан' });
};
