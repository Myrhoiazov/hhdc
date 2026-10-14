import { lazy } from 'react';

export const UsersPageAsync = lazy(() =>
    import('./UsersPage').then((module) => ({ default: module.UsersPage }))
);
