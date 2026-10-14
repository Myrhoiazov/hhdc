import { lazy } from 'react';

// The list of contacts and the card of one person are two pages of one slice.
export const PeoplePageAsync = lazy(() =>
    import('./list/PeoplePage').then((module) => ({ default: module.PeoplePage }))
);
export const PersonPageAsync = lazy(() =>
    import('./person/PersonPage').then((module) => ({ default: module.PersonPage }))
);
