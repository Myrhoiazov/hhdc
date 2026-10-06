import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSendIdempotencyKey, draftBodyToHtml, runSendPipeline, type SendPipelineRepository } from './send-pipeline.service';

test('buildSendIdempotencyKey is deterministic per draft/version', () => {
    assert.equal(buildSendIdempotencyKey(9, 2), buildSendIdempotencyKey(9, 2));
    assert.notEqual(buildSendIdempotencyKey(9, 1), buildSendIdempotencyKey(9, 2));
});

test('draftBodyToHtml escapes markup and preserves line breaks', () => {
    assert.equal(draftBodyToHtml('Hi <there>\nSecond line & more.'), '<p>Hi &lt;there&gt;<br>Second line &amp; more.</p>');
});

test('send pipeline claims an approved draft, sends it, and marks it sent', async () => {
    const events: string[] = [];
    const repository: SendPipelineRepository = {
        async findApprovedCandidates() { return [{ draftId: 4, version: 1, body: 'Yes, see you then.', sourceEmailMessageId: 77 }]; },
        async claimForSending(draftId, version, idempotencyKey) {
            events.push(`claim:${draftId}:${version}:${idempotencyKey}`);
            return true;
        },
        async markSent(draftId, version, sentEmailMessageId) { events.push(`sent:${draftId}:${version}:${sentEmailMessageId}`); },
        async markFailed(draftId, version, error) { events.push(`failed:${draftId}:${version}:${error}`); },
    };
    const result = await runSendPipeline(repository, {
        async replyToMessage(sourceEmailMessageId, html) {
            events.push(`smtp:${sourceEmailMessageId}:${html}`);
            return { id: 501 };
        },
    }, 1);

    assert.deepEqual(result, { processed: 1, skipped: 0, failed: 0 });
    assert.deepEqual(events, [
        'claim:4:1:ai-draft-4-v1',
        'smtp:77:<p>Yes, see you then.</p>',
        'sent:4:1:501',
    ]);
});

test('send pipeline skips a candidate that another worker already claimed', async () => {
    const repository: SendPipelineRepository = {
        async findApprovedCandidates() { return [{ draftId: 4, version: 1, body: 'Body.', sourceEmailMessageId: 77 }]; },
        async claimForSending() { return false; },
        async markSent() { throw new Error('should not be called'); },
        async markFailed() { throw new Error('should not be called'); },
    };
    const result = await runSendPipeline(repository, {
        async replyToMessage() { throw new Error('should not be called'); },
    }, 1);

    assert.deepEqual(result, { processed: 0, skipped: 1, failed: 0 });
});

test('send pipeline marks a claimed draft as failed when SMTP sending throws, without retrying automatically', async () => {
    const events: string[] = [];
    const repository: SendPipelineRepository = {
        async findApprovedCandidates() { return [{ draftId: 4, version: 1, body: 'Body.', sourceEmailMessageId: 77 }]; },
        async claimForSending() { return true; },
        async markSent() { throw new Error('should not be called'); },
        async markFailed(draftId, version, error) { events.push(`failed:${draftId}:${version}:${error}`); },
    };
    const result = await runSendPipeline(repository, {
        async replyToMessage() { throw new Error('SMTP connection refused'); },
    }, 1);

    assert.deepEqual(result, { processed: 0, skipped: 0, failed: 1 });
    assert.deepEqual(events, ['failed:4:1:SMTP connection refused']);
});

test('send pipeline processes multiple approved candidates independently', async () => {
    const repository: SendPipelineRepository = {
        async findApprovedCandidates() {
            return [
                { draftId: 1, version: 1, body: 'One.', sourceEmailMessageId: 10 },
                { draftId: 2, version: 3, body: 'Two.', sourceEmailMessageId: 20 },
            ];
        },
        async claimForSending() { return true; },
        async markSent() {},
        async markFailed() {},
    };
    const result = await runSendPipeline(repository, {
        async replyToMessage(sourceEmailMessageId) { return { id: sourceEmailMessageId * 10 }; },
    }, 5);

    assert.deepEqual(result, { processed: 2, skipped: 0, failed: 0 });
});
