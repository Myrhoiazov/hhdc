import assert from 'node:assert/strict';
import test from 'node:test';
import { commentListSelect, commentListSelectWithAuthor } from './comments.select';

// Contract tests for the Comments Prisma projections (spec #23 / #44).
// These lock the exact field set the API returns: the client renders only
// id, text, createdAt, author.id, author.firstName. If a future refactor
// re-adds userId, clientId, author.lastName, or starts including the full
// User row (password hash/salt) these tests fail.

test('commentListSelect projects exactly id, text, createdAt', () => {
    assert.deepEqual(commentListSelect, {
        id: true,
        text: true,
        createdAt: true,
    });
});

test('commentListSelectWithAuthor expands with only author id + firstName', () => {
    assert.deepEqual(commentListSelectWithAuthor, {
        id: true,
        text: true,
        createdAt: true,
        author: {
            select: {
                id: true,
                firstName: true,
            },
        },
    });
});

test('expanded projection never leaks persistence-only fields', () => {
    assert.equal('userId' in commentListSelectWithAuthor, false);
    assert.equal('clientId' in commentListSelectWithAuthor, false);
    assert.equal('lastName' in commentListSelectWithAuthor.author.select, false);
});