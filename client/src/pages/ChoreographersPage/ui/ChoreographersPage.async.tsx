import { lazy } from 'react';

// The list and the card of a choreographer are two pages of one slice: they share the avatar, the
// styles and the photo loading.
export const ChoreographersPageAsync = lazy(() =>
    import('./list/ChoreographersPage').then((module) => ({ default: module.ChoreographersPage }))
);
export const ChoreographerPageAsync = lazy(() =>
    import('./profile/ChoreographerPage').then((module) => ({ default: module.ChoreographerPage }))
);
