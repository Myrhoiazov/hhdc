import { lazy } from 'react';

export const AuditPageAsync = lazy(() =>
    import('./AuditPage').then((module) => ({ default: module.AuditPage }))
);
