import { lazy } from 'react';

export const CampaignsPageAsync = lazy(() =>
    import('./CampaignsPage').then((module) => ({ default: module.CampaignsPage }))
);
