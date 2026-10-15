import { lazy } from 'react';

export const DuplicatesPageAsync = lazy(() =>
    import('./DuplicatesPage').then((module) => ({ default: module.DuplicatesPage }))
);
