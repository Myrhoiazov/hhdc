import { lazy } from 'react';

// The list of events and the page of one event are two pages of one slice.
export const EventsPageAsync = lazy(() =>
    import('./list/EventsPage').then((module) => ({ default: module.EventsPage }))
);
export const EventPageAsync = lazy(() =>
    import('./event/EventPage').then((module) => ({ default: module.EventPage }))
);
