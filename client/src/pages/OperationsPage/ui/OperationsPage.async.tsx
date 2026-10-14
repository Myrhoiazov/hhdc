import { lazy } from 'react';

export const OperationsPageAsync = lazy(() =>
    import('./OperationsPage').then((module) => ({ default: module.OperationsPage }))
);
