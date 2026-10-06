import test from 'node:test';
import assert from 'node:assert/strict';
import server from '../../app';

process.env.SECRET_SALT ||= 'test-secret-salt';

const listen = () => new Promise<number>((resolve) => {
    server.listen(0, () => {
        const address = server.address();
        resolve(typeof address === 'object' && address ? address.port : 0);
    });
});

const close = () => new Promise<void>((resolve) => server.close(() => resolve()));

test('GET /api/v1/health returns 200 with ok status', async () => {
    const port = await listen();

    try {
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.status, 'ok');
    } finally {
        await close();
    }
});
