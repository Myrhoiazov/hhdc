import { lazy } from 'react';

export const AutomationsPageAsync = lazy(() =>
    import('./AutomationsPage').then((module) => ({ default: module.AutomationsPage }))
);
