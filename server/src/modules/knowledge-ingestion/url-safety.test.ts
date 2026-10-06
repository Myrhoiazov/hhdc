import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPublicHttpUrl } from './url-safety';

const fakeDns = (map: Record<string, string[]>) => async (hostname: string) => {
    const addresses = map[hostname];
    if (!addresses) throw new Error(`no fake DNS entry for ${hostname}`);
    return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
};

const rejected = async (value: string, dns?: ReturnType<typeof fakeDns>) => {
    const result = await checkPublicHttpUrl(value, dns);
    assert.equal(result.safe, false);
    return result.reason;
};

test('rejects non-http(s) protocols', async () => {
    assert.equal(await rejected('ftp://example.com/file'), 'unsupported_protocol');
    assert.equal(await rejected('file:///etc/passwd'), 'unsupported_protocol');
});

test('rejects an invalid URL string', async () => {
    assert.equal(await rejected('not a url'), 'invalid_url');
});

test('rejects credentials embedded in the URL', async () => {
    assert.equal(await rejected('https://admin:secret@example.com/'), 'credentials_in_url');
});

test('rejects an IPv4 literal in a private range', async () => {
    assert.equal(await rejected('http://127.0.0.1/'), 'private_address');
    assert.equal(await rejected('http://10.0.0.5/'), 'private_address');
    assert.equal(await rejected('http://169.254.169.254/'), 'private_address');
    assert.equal(await rejected('http://192.168.1.1/'), 'private_address');
});

test('rejects "localhost" without needing DNS', async () => {
    assert.equal(await rejected('http://localhost:8080/'), 'private_address');
});

test('rejects a hostname that resolves to a private address (DNS rebinding)', async () => {
    const dns = fakeDns({ 'internal.example.com': ['10.1.2.3'] });
    assert.equal(await rejected('http://internal.example.com/', dns), 'private_address');
});

test('accepts a public https URL that resolves to a public address', async () => {
    const dns = fakeDns({ 'example.com': ['93.184.216.34'] });
    const result = await checkPublicHttpUrl('https://example.com/page', dns);
    assert.equal(result.safe, true);
    assert.equal(result.url?.hostname, 'example.com');
});

test('rejects an IPv6 loopback and unique-local literal', async () => {
    assert.equal(await rejected('http://[::1]/'), 'private_address');
    assert.equal(await rejected('http://[fd00::1]/'), 'private_address');
});

test('rejects a hostname whose DNS lookup fails', async () => {
    const dns = fakeDns({});
    assert.equal(await rejected('http://does-not-resolve.example/', dns), 'private_address');
});
