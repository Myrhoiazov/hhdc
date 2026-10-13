import { Permission } from '../types/permission';

export const hasPermission = (held: readonly string[] | undefined, permission: Permission) =>
    Boolean(held?.includes(permission));
