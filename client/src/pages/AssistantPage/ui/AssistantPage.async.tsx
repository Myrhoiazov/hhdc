import { lazy } from 'react';

export const AssistantPageAsync = lazy(() =>
    import('./AssistantPage').then((module) => ({ default: module.AssistantPage }))
);
