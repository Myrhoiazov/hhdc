import assert from 'node:assert/strict';
import test from 'node:test';
import {
    classifyEmail,
    emailClassificationSchema,
    normalizeEmail,
    type EmailClassificationInput,
    type LlmClient,
} from './email-assistant.service';

const baseEmail: EmailClassificationInput = {
    fromAddress: 'parent@example.com',
    subject: 'Proefles',
    text: 'Hallo, kan mijn dochter volgende week een proefles volgen?',
    html: '<p>Hallo, kan mijn dochter volgende week een proefles volgen?</p>',
    headers: new Map(),
};

test('emailClassificationSchema accepts a classification missing only "reason" and defaults it to empty', () => {
    // Regression: observed live, a small local model occasionally omits just this one
    // audit/display-only field while getting every safety-relevant field right — that used to
    // fail the whole classification and burn a repair retry over text nothing branches on.
    const result = emailClassificationSchema.parse({
        spam: false, needsReply: true, language: 'ru', intent: 'trial_lesson', confidence: 0.7,
    });
    assert.equal(result.reason, '');
});

test('emailClassificationSchema still rejects a classification missing a safety-relevant field', () => {
    assert.throws(() => emailClassificationSchema.parse({
        needsReply: true, language: 'ru', intent: 'trial_lesson', confidence: 0.7, reason: 'x',
    }));
});

test('normalizeEmail converts HTML to bounded plain text and drops active markup', () => {
    const result = normalizeEmail({
        ...baseEmail,
        text: null,
        html: '<script>alert(1)</script><p>Hello&nbsp;there</p><a href="https://example.com">Read</a>',
    });

    assert.equal(result.normalizedBody, 'Hello there\nRead (https://example.com)');
});

test('classifyEmail normalizes untrusted HTML and removes quoted history', async () => {
    const llm: LlmClient = {
        classifyEmail: async (input) => {
            assert.equal(input.normalizedBody, 'Hallo!\n\nKan ik langskomen?');
            return {
                spam: false,
                needsReply: true,
                language: 'nl',
                intent: 'trial_lesson',
                confidence: 0.91,
                reason: 'Parent asks about a trial lesson.',
            };
        },
    };

    const result = await classifyEmail({
        ...baseEmail,
        text: 'Hallo!\n\nKan ik langskomen?\n\n> Previous message',
        html: '<script>alert(1)</script><p>Hallo!</p><p>Kan ik langskomen?</p>',
    }, llm);

    assert.equal(result.normalizedBody, 'Hallo!\n\nKan ik langskomen?');
    assert.equal(result.classification.intent, 'trial_lesson');
});

test('classifyEmail stops on a deterministic spam signal without calling the LLM', async () => {
    let calls = 0;
    const llm: LlmClient = {
        classifyEmail: async () => {
            calls += 1;
            throw new Error('LLM must not be called for deterministic spam');
        },
    };

    const result = await classifyEmail({
        ...baseEmail,
        headers: new Map([['x-spam-flag', 'YES']]),
    }, llm);

    assert.equal(calls, 0);
    assert.equal(result.classification.spam, true);
    assert.equal(result.classification.reason, 'mailbox_spam_header');
});

test('classifyEmail rejects invalid classifier output instead of guessing', async () => {
    let calls = 0;
    const llm: LlmClient = {
        classifyEmail: async () => {
            calls += 1;
            throw new Error('invalid structured output');
        },
    };

    await assert.rejects(
        () => classifyEmail(baseEmail, llm),
        /invalid structured output/,
    );
    assert.equal(calls, 1);
});
