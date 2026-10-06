import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import { createClientsController, deleteClientByIdController, getClientCountController } from './clients.controller';
import prisma from '../../../prisma/prisma-client';
import * as clientsService from './clients.service';
import * as auditService from '../auth/auth.security-audit.service';

const response = () => {
    const calls: { body?: unknown } = {};
    const res: Response = fromPartial({
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json(body: unknown) { calls.body = body; return this; },
    });
    return { res, calls };
};
function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}
test('returns the current student count', async (t) => {
    stub(t, prisma.client, 'count', async () => 42);
    const { res, calls } = response();
    await getClientCountController(fromPartial({}), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls.body, { count: 42 });
});

test('records a Mini App student-created event from the server authentication marker', async (t) => {
    const events: unknown[] = [];
    t.mock.method(clientsService, 'createClient', async () => ({ id: 99, firstName: 'Anna' } as never));
    t.mock.method(auditService, 'recordAuthSecurityEvent', async (input: unknown) => { events.push(input); });
    const { res } = response();
    const req: Request = fromPartial({
        body: { firstName: 'Anna', groupIds: [] },
        user: { id: 7 },
        authMethod: 'telegram-miniapp',
    });

    await createClientsController(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
        type: 'TELEGRAM_MINIAPP_STUDENT_CREATED',
        actorUserId: 7,
        metadata: { clientId: 99 },
        req,
    });
});

test('does not trust a raw Telegram header as an audit marker', async (t) => {
    const events: unknown[] = [];
    t.mock.method(clientsService, 'createClient', async () => ({ id: 100, firstName: 'Eva' } as never));
    t.mock.method(auditService, 'recordAuthSecurityEvent', async (input: unknown) => { events.push(input); });
    const { res } = response();
    const req: Request = fromPartial({
        body: { firstName: 'Eva', groupIds: [] },
        user: { id: 7 },
        header: () => 'unverified',
    });

    await createClientsController(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(events.length, 0);
});

test('passes the creator and the CRM source to createClient for the new-student notification', async (t) => {
    const createMock = t.mock.method(clientsService, 'createClient', async () => ({ id: 101, firstName: 'Mila' } as never));
    const { res } = response();
    const req: Request = fromPartial({
        body: { firstName: 'Mila', groupIds: [] },
        user: { id: 7, email: 'manager@example.test' },
    });

    await createClientsController(req, res);

    const [, options] = createMock.mock.calls[0].arguments;
    assert.equal(options?.createdByEmail, 'manager@example.test');
    assert.equal(options?.source, 'CRM');
});

test('marks a student created through the Mini App with the Telegram source', async (t) => {
    const createMock = t.mock.method(clientsService, 'createClient', async () => ({ id: 102, firstName: 'Noor' } as never));
    t.mock.method(auditService, 'recordAuthSecurityEvent', async () => {});
    const { res } = response();
    const req: Request = fromPartial({
        body: { firstName: 'Noor', groupIds: [] },
        user: { id: 7, email: 'admin@example.test' },
        authMethod: 'telegram-miniapp',
    });

    await createClientsController(req, res);

    const [, options] = createMock.mock.calls[0].arguments;
    assert.equal(options?.source, 'TELEGRAM_MINIAPP');
});

test('passes the employee who deletes a student to deleteClient for the student-deleted notification', async (t) => {
    const deleteMock = t.mock.method(clientsService, 'deleteClient', async () => ({ id: 55 } as never));
    const { res } = response();
    const req: Request = fromPartial({ params: { id: '55' }, user: { id: 7, email: 'manager@example.test' } });

    await deleteClientByIdController(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(deleteMock.mock.calls[0].arguments, [55, { deletedByEmail: 'manager@example.test' }]);
});
