import { lazy } from 'react';

export const CommunicationsPageAsync = lazy(() =>
    import('./CommunicationsPage').then((module) => ({ default: module.CommunicationsPage }))
);
