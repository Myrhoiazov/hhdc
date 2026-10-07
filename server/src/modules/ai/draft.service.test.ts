import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatThread } from './draft.service';

test('the thread is given oldest first, says who wrote each message and is cut to its opening', () => {
    const thread = formatThread([
        { direction: 'OUTBOUND', bodyText: 'Hi Anna, the Early Bird is €390.', createdAt: new Date('2026-10-02T10:00:00Z') },
        { direction: 'INBOUND', bodyText: `  How much is the ticket? ${'x'.repeat(900)}`, createdAt: new Date('2026-10-01T09:00:00Z') },
    ]);
    const [first, second] = thread.split('\n\n');
    assert.match(first, /^\[2026-10-01 · customer\] How much is the ticket\?/);
    assert.equal(first.length, '[2026-10-01 · customer] '.length + 600);
    assert.equal(second, '[2026-10-02 · HHDC team] Hi Anna, the Early Bird is €390.');
    assert.equal(formatThread([]), '');
});
