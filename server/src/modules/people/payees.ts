// An expense of an event is paid to somebody who works on it: a choreographer or a staff member.
export const PAYEE_ROLES = ['CHOREOGRAPHER', 'STAFF'] as const;

export const mayBePaid = (roles: string[]): boolean => roles.some(role => (PAYEE_ROLES as readonly string[]).includes(role));
