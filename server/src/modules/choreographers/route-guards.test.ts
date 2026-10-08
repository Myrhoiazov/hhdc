import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Router } from 'express';
import { choreographerRoutes } from './choreographers.routes';
import { choreographerAssignmentRoutes } from './finance.routes';
import { choreographerDocumentRoutes, documentFileRoutes } from '../documents/document-files.routes';

interface RouteLayer { route?: { path: string; methods: Record<string, boolean>; stack: Array<{ name: string }> }; handle?: { stack?: RouteLayer[] } }

// Every endpoint, including those of routers mounted inside another router.
const endpoints = (router: Router): Array<{ label: string; handlers: string[] }> => (router.stack as unknown as RouteLayer[]).flatMap(layer => {
    if (layer.route) return [{ label: `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`, handlers: layer.route.stack.map(item => item.name) }];
    return layer.handle?.stack ? endpoints(layer.handle as unknown as Router) : [];
});

const routers: Array<[string, Router]> = [
    ['choreographers', choreographerRoutes], ['choreographer-assignments', choreographerAssignmentRoutes],
    ['choreographer documents', choreographerDocumentRoutes], ['document files', documentFileRoutes],
];

for (const [name, router] of routers) {
    test(`every ${name} endpoint checks a permission before its handler runs`, () => {
        const found = endpoints(router);
        assert.ok(found.length > 0, 'the router has endpoints');
        const open = found.filter(endpoint => endpoint.handlers[0] !== 'requirePermission').map(endpoint => endpoint.label);
        assert.deepEqual(open, []);
    });
}
