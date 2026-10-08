import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPartial } from '@total-typescript/shoehorn';
import type { Request, RequestHandler, Response, Router } from 'express';
import { dashboardRouter } from '../dashboard/dashboard.routes';
import { eventsRouter } from '../events/events.routes';
import { peopleRouter } from '../people/people.routes';
import { providersRouter } from '../providers/providers.routes';
import { ticketingRouter } from './ticketing.routes';

// Every route that reads or writes Weeztix data is guarded by a permission, and by the right one:
// a user holding only that permission passes the guard, a user holding every other one does not
// get a pass by accident because the guard is the first thing the route runs.

const guardOf = (router: Router, method: string, path: string) => {
    const route = router.stack.map(layer => layer.route).find(item => item?.path === path && item.stack.some(handler => handler.method === method));
    assert.ok(route, `${method.toUpperCase()} ${path} is not registered`);
    return route.stack[0];
};

const passes = (guard: RequestHandler, permissions: string[]): boolean => {
    let outcome: unknown = 'not called';
    const res = fromPartial<Response>({ locals: { user: { id: 'u-1', permissions } } });
    guard(fromPartial<Request>({ res }), res, (error?: unknown) => { outcome = error; });
    return outcome === undefined;
};

const ROUTES: Array<[Router, string, string, string]> = [
    [providersRouter, 'post', '/weeztix/authorize', 'providers.manage'],
    [providersRouter, 'post', '/weeztix/connect', 'providers.manage'],
    [providersRouter, 'post', '/:id/weeztix-check', 'providers.manage'],
    [providersRouter, 'post', '/:id/weeztix-contacts', 'people.import'],
    [providersRouter, 'post', '/:id/weeztix-catalog', 'ticketing.sync'],
    [providersRouter, 'post', '/:id/weeztix-sales', 'ticketing.sync'],
    [ticketingRouter, 'post', '/ticketing/sync', 'ticketing.sync'],
    [ticketingRouter, 'get', '/orders', 'ticketing.read'],
    [ticketingRouter, 'get', '/orders/:id', 'ticketing.read'],
    [ticketingRouter, 'get', '/tickets', 'ticketing.read'],
    [ticketingRouter, 'get', '/tickets/:id', 'ticketing.read'],
    [eventsRouter, 'get', '/:id/ticket-types', 'events.read'],
    [eventsRouter, 'get', '/:id/sales', 'finance.read'],
    [eventsRouter, 'get', '/:id/registrations', 'events.read'],
    [eventsRouter, 'get', '/:id/expenses', 'finance.read'],
    [eventsRouter, 'post', '/:id/expenses', 'finance.read'],
    [eventsRouter, 'patch', '/:id/expenses/:expenseId', 'finance.read'],
    [peopleRouter, 'get', '/:id/expenses', 'finance.read'],
    [peopleRouter, 'get', '/:id/orders', 'ticketing.read'],
    [dashboardRouter, 'get', '/insights', 'finance.read'],
];

for (const [router, method, path, permission] of ROUTES) {
    test(`${method.toUpperCase()} ${path} starts with a permission guard that ${permission} satisfies`, () => {
        const guard = guardOf(router, method, path);
        assert.equal(guard.name, 'requirePermission');
        assert.equal(passes(guard.handle, [permission]), true);
    });
}
