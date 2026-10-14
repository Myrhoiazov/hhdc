import { lazy } from 'react';

export const KnowledgePageAsync = lazy(() =>
    import('./KnowledgePage').then((module) => ({ default: module.KnowledgePage }))
);
