import { lazy } from 'react';

export const PlatformPageAsync = lazy(() =>
    import('./PlatformPage').then((module) => ({ default: module.PlatformPage }))
);
