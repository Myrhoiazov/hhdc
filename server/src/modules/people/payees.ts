// An expense of an event is paid to somebody who works on it: a choreographer, a staff member,
// or a partner who supplies something for it.
export const PAYEE_ROLES = ['CHOREOGRAPHER', 'STAFF', 'PARTNER'] as const;

export const mayBePaid = (roles: string[]): boolean => roles.some(role => (PAYEE_ROLES as readonly string[]).includes(role));
