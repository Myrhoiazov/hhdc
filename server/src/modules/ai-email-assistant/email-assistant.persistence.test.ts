import assert from 'node:assert/strict';
import test from 'node:test';
import { persistClassification, persistNormalizedEmail, type AiEmailRepository } from './email-assistant.persistence';

test('persistence boundary upserts normalized messages and validated classifications', async () => {
    const calls: unknown[] = [];
    const repository: AiEmailRepository = {
        async findPendingEmails() { return []; },
        async upsertNormalizedEmail(record) {
            calls.push(['message', record]);
            return { id: 42 };
        },
        async upsertClassification(...args) {
            calls.push(['classification', args]);
        },
        async markFailed() {},
    };

    const message = await persistNormalizedEmail(repository, {
        sourceEmailMessageId: 7,
        sender: 'parent@example.com',
        recipients: [{ address: 'info@example.com' }],
        normalizedBody: 'Can my child join a trial lesson?',
        receivedAt: new Date('2026-09-15T10:00:00Z'),
    });
    await persistClassification(repository, message.id, {
        spam: false,
        needsReply: true,
        language: 'en',
        intent: 'trial_lesson',
        confidence: 0.9,
        reason: 'Question about a trial lesson.',
    });

    assert.equal(calls.length, 2);
    assert.equal((calls[0] as [string])[0], 'message');
    assert.equal((calls[1] as [string])[0], 'classification');
});

test('persistence boundary rejects invalid classification data', async () => {
    const repository: AiEmailRepository = {
        async findPendingEmails() { return []; },
        async upsertNormalizedEmail() { return { id: 1 }; },
        async upsertClassification() { throw new Error('must not persist'); },
        async markFailed() {},
    };

    assert.throws(
        () => persistClassification(repository, 1, {
            spam: false,
            needsReply: true,
            language: 'xx' as 'nl',
            intent: 'other',
            confidence: 0.5,
            reason: 'invalid language',
        }),
    );
});
