export interface User {
    id: string;
    name: string;
    avatar?: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export interface UserSchema {
    authData?: User;

    _inited: boolean;
}
