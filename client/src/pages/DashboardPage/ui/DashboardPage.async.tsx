import { lazy } from 'react';

export const DashboardPageAsync = lazy(() =>
    import('./DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
