export enum Role {
    ADMIN = 'Администратор',
    MANAGER = 'Менеджер',
    GUEST = 'Гость',
    DOCTOR = 'Врач',
}

export enum RoleKey {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    GUEST = "GUEST",
    DOCTOR = "DOCTOR",
}

export const RoleLabels: Record<RoleKey, string> = {
    [RoleKey.ADMIN]: "Администратор",
    [RoleKey.MANAGER]: "Менеджер",
    [RoleKey.GUEST]: "Гость",
    [RoleKey.DOCTOR]: "Врач",
};
