import { UserRole } from "@prisma/client";

export interface IUserAttributes {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    salt: string | null;
    role?: UserRole;
    isActive?: boolean;
    isEnabled?: boolean;
    authVersion?: number;
    lastLogin?: Date;
}
