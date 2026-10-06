import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrismaCrmReader } from './crm-context.service';

test('CRM reader performs a minimal read-only projection', async () => {
    let args: unknown;
    const reader = createPrismaCrmReader({
        async findFirst(input) {
            args = input;
            return { id: 3, email: 'person@example.com', firstName: 'Ada', lastName: 'Lovelace', expiresAt: null };
        },
    });
    assert.deepEqual(await reader.findContactByEmail('person@example.com'), {
        id: 3, email: 'person@example.com', firstName: 'Ada', lastName: 'Lovelace', status: 'active',
    });
    assert.deepEqual(args, {
        where: { email: 'person@example.com' },
        select: { id: true, email: true, firstName: true, lastName: true, expiresAt: true },
    });
});
