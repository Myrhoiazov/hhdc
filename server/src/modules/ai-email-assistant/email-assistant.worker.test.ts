import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyPendingAiEmails } from './email-assistant.worker';
import type { AiEmailRepository } from './email-assistant.persistence';

const repositoryWith = (emails: Array<{ id: number; sender: string; subject: string; normalizedBody: string }>) => {
    const statuses: Array<[number, string]> = [];
    const repository: AiEmailRepository = {
        async findPendingEmails() { return emails; },
        async upsertNormalizedEmail() { return { id: 1 }; },
        async upsertClassification(emailId, classification) {
            statuses.push([emailId, classification.intent]);
        },
        async markFailed(emailId) {
            statuses.push([emailId, 'FAILED']);
        },
    };
    return { repository, statuses };
};

test('worker classifies pending emails sequentially and records results', async () => {
    const { repository, statuses } = repositoryWith([
        { id: 1, sender: 'a@example.com', subject: 'Trial', normalizedBody: 'Can I book a trial?' },
        { id: 2, sender: 'b@example.com', subject: 'Price', normalizedBody: 'What does it cost?' },
    ]);
    const calls: number[] = [];

    const result = await classifyPendingAiEmails(repository, {
        async classifyEmail(input) {
            calls.push(Number(input.fromAddress[0] === 'a'));
            return {
                spam: false,
                needsReply: true,
                language: 'en',
                intent: 'other',
                confidence: 0.8,
                reason: 'Needs a response.',
            };
        },
    }, 2);

    assert.deepEqual(result, { processed: 2, failed: 0 });
    assert.deepEqual(calls, [1, 0]);
    assert.deepEqual(statuses, [[1, 'other'], [2, 'other']]);
});

test('worker marks failed classification for retry/manual review', async () => {
    const { repository, statuses } = repositoryWith([
        { id: 9, sender: 'a@example.com', subject: 'Question', normalizedBody: 'Hello' },
    ]);

    const result = await classifyPendingAiEmails(repository, {
        async classifyEmail() {
            throw new Error('Ollama unavailable');
        },
    });

    assert.deepEqual(result, { processed: 0, failed: 1 });
    assert.deepEqual(statuses, [[9, 'FAILED']]);
});
