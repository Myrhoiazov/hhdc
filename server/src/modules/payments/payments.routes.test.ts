import test from 'node:test';
import assert from 'node:assert/strict';
import mollieRouter from './payments.routes';

type RouteLayer = {
    route?: {
        path?: string;
        methods?: Record<string, boolean>;
    };
};

const hasRoute = (method: string, path: string) => {
    const layers = (mollieRouter as { stack?: RouteLayer[] }).stack ?? [];

    return layers.some((layer) => layer.route?.path === path && Boolean(layer.route?.methods?.[method]));
};

test('Mollie router exposes GET /customers/edit-data/:customerId', () => {
    assert.equal(hasRoute('get', '/customers/edit-data/:customerId'), true);
});

test('Mollie router exposes GET /customers/:customerId', () => {
    assert.equal(hasRoute('get', '/customers/:customerId'), true);
});

test('Mollie router exposes DELETE /customers/:customerId', () => {
    assert.equal(hasRoute('delete', '/customers/:customerId'), true);
});

test('Mollie router exposes DELETE /subscriptions/:subscriptionId', () => {
    assert.equal(hasRoute('delete', '/subscriptions/:subscriptionId'), true);
});

test('Mollie router exposes GET /customers/:customerId/payments', () => {
    assert.equal(hasRoute('get', '/customers/:customerId/payments'), true);
});

test('Mollie router exposes GET /customers/:customerId/student-links', () => {
    assert.equal(hasRoute('get', '/customers/:customerId/student-links'), true);
});
