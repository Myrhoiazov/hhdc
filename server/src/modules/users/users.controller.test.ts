import assert from 'node:assert/strict';
import test from 'node:test';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { fromAny, fromPartial } from '@total-typescript/shoehorn';
import { validateUpdateUserRequest } from './users.controller';

const createReq = (actor?: { id: number; role: UserRole }): Request => fromPartial({
    user: actor,
});

test('rejects a request with no userId', () => {
    const error = validateUpdateUserRequest(createReq(), 0, UserRole.ADMIN, undefined);
    assert.equal(error, 'Role or account state is required');
});

test('rejects a request with neither role nor isEnabled', () => {
    const error = validateUpdateUserRequest(createReq(), 5, undefined, undefined);
    assert.equal(error, 'Role or account state is required');
});

test('rejects an invalid role value', () => {
    const error = validateUpdateUserRequest(createReq(), 5, 'NOT_A_ROLE' as UserRole, undefined);
    assert.equal(error, 'Invalid role');
});

test('rejects a non-boolean isEnabled value', () => {
    const error = validateUpdateUserRequest(createReq(), 5, undefined, fromAny('yes'));
    assert.equal(error, 'Invalid account state');
});

test('rejects disabling your own account', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, undefined, false);
    assert.equal(error, 'Нельзя заблокировать собственный аккаунт');
});

test('allows enabling your own account', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, undefined, true);
    assert.equal(error, null);
});

test('rejects changing your own role to a different role', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, UserRole.MANAGER, undefined);
    assert.equal(error, 'Нельзя изменить собственную роль');
});

test('allows "changing" your own role to the role you already have', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, UserRole.ADMIN, undefined);
    assert.equal(error, null);
});

test('allows changing another user\'s role', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 7, UserRole.MANAGER, undefined);
    assert.equal(error, null);
});

test('allows disabling another user\'s account', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 7, undefined, false);
    assert.equal(error, null);
});

import type { Response } from 'express';
import { linkTelegramMiniAppController } from './users.controller';
import * as identityService from '../auth/telegram-miniapp/telegram-miniapp-identity.service';
import * as usersService from './users.service';
import * as auditService from '../auth/auth.security-audit.service';

const linkResponse = (): Response => fromPartial({
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    json() { return this; },
});
const linkRequest = (id = '5', telegramUserId: unknown = '348397131'): Request => fromPartial({
    params: { id }, body: { telegramUserId }, user: { id: 1, role: UserRole.ADMIN },
});

test('links a valid numeric Telegram id to an enabled admin and records the actor', async (t) => {
    t.mock.method(usersService, 'getUserById', async () => ({ id: 5, role: 'ADMIN', isEnabled: true }));
    t.mock.method(identityService, 'linkMiniAppIdentity', async () => ({ ok: true }));
    const events: any[] = [];
    t.mock.method(auditService, 'recordAuthSecurityEvent', async (input: unknown) => events.push(input));
    const res = linkResponse();
    await linkTelegramMiniAppController(linkRequest(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(events[0].actorUserId, 1);
    assert.equal(events[0].targetUserId, 5);
});
for (const id of ['0', '-1', '1.5', 'oops']) {
    test(`rejects invalid target user id ${id}`, async () => {
        const res = linkResponse();
        await linkTelegramMiniAppController(linkRequest(id), res);
        assert.equal(res.statusCode, 400);
    });
}
for (const id of ['not-a-number', '0', '001', '9007199254740992', 348397131]) {
    test(`rejects invalid Telegram id ${id}`, async () => {
        const res = linkResponse();
        await linkTelegramMiniAppController(linkRequest('5', id), res);
        assert.equal(res.statusCode, 400);
    });
}
for (const [user, status] of [[null, 404], [{ role: 'MANAGER', isEnabled: true }, 403], [{ role: 'ADMIN', isEnabled: false }, 403]] as const) {
    test(`refuses unavailable target ${JSON.stringify(user)}`, async (t) => {
        t.mock.method(usersService, 'getUserById', async () => user);
        const res = linkResponse();
        await linkTelegramMiniAppController(linkRequest(), res);
        assert.equal(res.statusCode, status);
    });
}
test('returns conflict when a Telegram account is already linked', async (t) => {
    t.mock.method(usersService, 'getUserById', async () => ({ id: 5, role: 'ADMIN', isEnabled: true }));
    t.mock.method(identityService, 'linkMiniAppIdentity', async () => ({ ok: false, reason: 'IDENTITY_ALREADY_LINKED' }));
    const res = linkResponse();
    await linkTelegramMiniAppController(linkRequest(), res);
    assert.equal(res.statusCode, 409);
});
