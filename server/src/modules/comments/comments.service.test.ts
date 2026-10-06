import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../prisma/prisma-client';
import {
    commentListSelect,
    commentListSelectWithAuthor,
} from './comments.select';
import { createComment, findManyComments } from './comments.service';

type FindManyArgs = {
    where: { clientId: number };
    orderBy: { createdAt: 'desc' };
    select: unknown;
};

type CreateArgs = {
    data: { text: string | null; userId: number; clientId?: number };
    select: Record<string, true>;
};

// Contract tests for the Comments API (prompt 03): the service must query the
// exact Phase-2 projections and return rows shaped { id, text, createdAt }
// (+ author { id, firstName } when expanded).
//
// Prisma model delegates are lazy proxies, so `t.mock.method` cannot replace
// their methods; we stub the delegate method directly and restore it after
// each test. No real DB connection is made because the stub owns the query.

function stub<T extends (...args: never[]) => unknown>(
    delegate: Record<string, unknown>,
    method: string,
    impl: T,
): () => void {
    const original = delegate[method] as T;
    delegate[method] = impl;
    return () => {
        delegate[method] = original;
    };
}

test('findManyComments queries the base projection without expandUser', async () => {
    const rows = [{ id: 1, text: 'hello', createdAt: new Date('2026-01-01T00:00:00Z') }];
    let capturedArgs: unknown;
    const restore = stub(prisma.comment as unknown as Record<string, unknown>, 'findMany', async (args: unknown) => {
        capturedArgs = args;
        return rows;
    });
    try {
        const result = await findManyComments({ entityType: 'client', entityId: '1' });

        assert.deepEqual(result, rows);
        const args = capturedArgs as FindManyArgs;
        assert.deepEqual(args.select, commentListSelect);
        assert.equal(args.where.clientId, 1);
        assert.deepEqual(args.orderBy, { createdAt: 'desc' });
    } finally {
        restore();
    }
});

test('findManyComments with expandUser returns id/text/createdAt + author(id, firstName)', async () => {
    const rows = [
        {
            id: 2,
            text: 'hi',
            createdAt: new Date('2026-02-01T00:00:00Z'),
            author: { id: 7, firstName: 'Ada' },
        },
    ];
    let capturedArgs: unknown;
    const restore = stub(prisma.comment as unknown as Record<string, unknown>, 'findMany', async (args: unknown) => {
        capturedArgs = args;
        return rows;
    });
    try {
        const result = await findManyComments({ entityType: 'client', entityId: 42, expandUser: true });

        assert.deepEqual(result, rows);
        const args = capturedArgs as FindManyArgs;
        assert.deepEqual(args.select, commentListSelectWithAuthor);
        assert.equal(args.where.clientId, 42);
    } finally {
        restore();
    }
});

test('createComment selects only identity + rendered fields and coerces ids', async () => {
    const created = { id: 5, text: 'note', createdAt: new Date('2026-03-01T00:00:00Z') };
    let capturedArgs: unknown;
    const restore = stub(prisma.comment as unknown as Record<string, unknown>, 'create', async (args: unknown) => {
        capturedArgs = args;
        return created;
    });
    try {
        const result = await createComment({ text: 'note', userId: '7', clientId: '9' });

        assert.deepEqual(result, created);
        const args = capturedArgs as CreateArgs;
        assert.equal(args.data.userId, 7);
        assert.equal(args.data.clientId, 9);
        assert.deepEqual(args.select, { id: true, text: true, createdAt: true });
        // The full User row (incl. password hash/salt) must never be included.
        assert.equal('author' in args.select, false);
        assert.equal('userId' in args.select, false);
        assert.equal('clientId' in args.select, false);
    } finally {
        restore();
    }
});