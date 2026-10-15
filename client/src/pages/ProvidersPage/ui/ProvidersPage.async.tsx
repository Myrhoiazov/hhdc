import { lazy } from 'react';

export const ProvidersPageAsync = lazy(() =>
    import('./ProvidersPage').then((module) => ({ default: module.ProvidersPage }))
);
