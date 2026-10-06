import test from 'node:test';
import assert from 'node:assert/strict';
import { hitRateLimit, resetRateLimit, calculateProgressiveDelayMs } from './auth.rate-limit.service';

test('in-memory rate limit blocks after max attempts and can be reset', async () => {
    const key = `test-rate-limit:${Date.now()}:${Math.random()}`;
    const windowMs = 60_000;
    const maxAttempts = 2;

    await resetRateLimit(key);

    const first = await hitRateLimit({ key, windowMs, maxAttempts });
    const second = await hitRateLimit({ key, windowMs, maxAttempts });
    const third = await hitRateLimit({ key, windowMs, maxAttempts });

    assert.equal(first.limited, false);
    assert.equal(second.limited, false);
    assert.equal(third.limited, true);
    assert.equal(third.count, 3);
    assert.equal(third.store, 'memory');

    await resetRateLimit(key);
    const afterReset = await hitRateLimit({ key, windowMs, maxAttempts });
    assert.equal(afterReset.limited, false);
    assert.equal(afterReset.count, 1);
});

test('progressive delay grows after the first attempt', () => {
    assert.equal(calculateProgressiveDelayMs(1), 0);
    assert.ok(calculateProgressiveDelayMs(2) >= 250);
    assert.ok(calculateProgressiveDelayMs(20) <= 2149);
});
