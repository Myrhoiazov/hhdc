import { lazy } from 'react';

export const NotificationsPageAsync = lazy(() =>
    import('./NotificationsPage').then((module) => ({ default: module.NotificationsPage }))
);
