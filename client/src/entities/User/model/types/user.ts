import { RoleKey } from "@/entities/Role";

export interface User {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
    email: string;
    role: RoleKey
}

export interface UserSchema {
    authData?: User;

    _inited: boolean;
}
