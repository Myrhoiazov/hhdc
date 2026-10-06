import test from 'node:test';
import assert from 'node:assert/strict';
import server from '../../app';

test('the API rejects unauthenticated person creation before accessing data', async () => {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Missing server port');
        const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/people`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: 'Participant' }) });
        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.error.code, 'UNAUTHENTICATED');
        assert.equal(typeof body.error.requestId, 'string');
        assert.equal(body.error.stack, undefined);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
