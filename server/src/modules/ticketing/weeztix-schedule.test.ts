import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncWeeztixWhenDue } from './weeztix-schedule';

const MINUTE = 60_000;
const start = Date.now() + 1_000_000;

// The schedule keeps its clock between calls, so the steps run in order inside one test.
test('Weeztix is read when the interval has passed, never twice at once, and not when switched off', async () => {
    let sweeps = 0;
    const sweep = async () => { sweeps += 1; };
    const at = (minutes: number, extra = {}) => syncWeeztixWhenDue({ intervalMs: 10 * MINUTE, now: start + minutes * MINUTE, sweep, env: {}, ...extra });

    assert.equal(await at(0), true);
    assert.equal(await at(9), false);
    assert.equal(await at(10), true);
    assert.equal(sweeps, 2);

    assert.equal(await at(30, { env: { WEEZTIX_SYNC_ENABLED: 'false' } }), false);

    let release = (): void => undefined;
    const slow = at(30, { sweep: () => new Promise<void>(resolve => { release = resolve; }) });
    assert.equal(await at(60), false, 'a sweep is still running');
    release();
    assert.equal(await slow, true);
    assert.equal(await at(60), true);

    await assert.rejects(at(90, { sweep: async () => { throw new Error('boom'); } }), /boom/);
    assert.equal(await at(120), true, 'a failed sweep does not block the next one');
});

test('the interval comes from the environment and falls back to ten minutes', async () => {
    const later = start + 1000 * MINUTE;
    const sweep = async (): Promise<void> => undefined;
    assert.equal(await syncWeeztixWhenDue({ now: later, sweep, env: { WEEZTIX_SYNC_INTERVAL_MS: '120000' } }), true);
    assert.equal(await syncWeeztixWhenDue({ now: later + MINUTE, sweep, env: { WEEZTIX_SYNC_INTERVAL_MS: '120000' } }), false);
    assert.equal(await syncWeeztixWhenDue({ now: later + 2 * MINUTE, sweep, env: { WEEZTIX_SYNC_INTERVAL_MS: '120000' } }), true);
    assert.equal(await syncWeeztixWhenDue({ now: later + 11 * MINUTE, sweep, env: { WEEZTIX_SYNC_INTERVAL_MS: 'soon' } }), false);
    assert.equal(await syncWeeztixWhenDue({ now: later + 12 * MINUTE, sweep, env: {} }), true);
});
