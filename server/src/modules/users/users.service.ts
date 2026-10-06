import { IUserAttributes } from './users.types';
import prisma from '../../../prisma/prisma-client'
import { UserRole } from '@prisma/client';

const User = prisma.user

export const getAllUsers = async () => await User.findMany({
    select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isEnabled: true,
        role: true,
    },
});

export const getUserById = async (id: number) => {
    const user = await User.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            isEnabled: true,
            authVersion: true,
            lastLogin: true,
            role: true,
        },
    });

    if (!user) return null;
    return user;
};
export const createUser = async (userData: Omit<IUserAttributes, 'id'>) => {
    return User.create({
        data: {
            ...userData,
            role: userData.role as UserRole || UserRole.MANAGER,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isEnabled: true,
        },
    });
};

export const updateUser = async (
    id: number,
    userData: Pick<IUserAttributes, 'email' | 'firstName' | 'lastName'>,
) => {
    return prisma.$transaction(async (transaction) => {
        const currentUser = await transaction.user.findUniqueOrThrow({
            where: { id },
            select: { email: true },
        });
        const emailChanged = currentUser.email !== userData.email;
        const updatedUser = await transaction.user.update({
            where: { id },
            data: {
                ...userData,
                ...(emailChanged && { authVersion: { increment: 1 } }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                isEnabled: true,
            },
        });

        if (emailChanged) {
            await transaction.session.deleteMany({ where: { userId: id } });
            await transaction.trustedDevice.deleteMany({ where: { userId: id } });
        }
        return updatedUser;
    });
};

export const updateUserSecurity = async (
    id: number,
    data: { role?: UserRole; isEnabled?: boolean },
) => prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({
        where: { id },
        data: {
            ...data,
            authVersion: { increment: 1 },
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isEnabled: true,
        },
    });

    await transaction.session.deleteMany({ where: { userId: id } });
    await transaction.trustedDevice.deleteMany({ where: { userId: id } });
    return user;
});
export const deleteUserById = async (id: number) => {
    const user = await User.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isEnabled: true,
        },
    });

    if (!user) return null;

    await prisma.user.delete({ where: { id } });
    return user;
};
export const getUserByEmail = async (email: string) => await User.findUnique({ where: { email } });

export const getUserWithCredentials = async (id: number) => {
    return await User.findUnique({
        where: { id },
        select: {
            id: true,
            password: true,
            salt: true,
        },
    });
};

export const upgradeUserPasswordHash = async (id: number, hashedPassword: string) => User.update({
    where: { id },
    data: { password: hashedPassword, salt: null },
});

export const updateUserPassword = async (id: number, hashedPassword: string, salt: string | null) => {
    return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                salt,
                authVersion: { increment: 1 },
            },
        });
        await transaction.session.deleteMany({ where: { userId: id } });
        await transaction.trustedDevice.deleteMany({ where: { userId: id } });
        return user;
    });
};
