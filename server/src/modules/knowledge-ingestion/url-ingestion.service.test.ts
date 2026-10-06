import assert from 'node:assert/strict';
import test from 'node:test';
import { fromAny } from '@total-typescript/shoehorn';
import { importKnowledgeUrl } from './url-ingestion.service';

const fakeDns = (map: Record<string, string[]>) => async (hostname: string) => {
    const addresses = map[hostname];
    if (!addresses) throw new Error(`no fake DNS entry for ${hostname}`);
    return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
};

const dnsFor = (host: string) => fakeDns({ [host]: ['93.184.216.34'] });

test('rejects a private/unsafe URL before making any request', async () => {
    let called = false;
    const fetchImpl = (async () => { called = true; return new Response('ok'); }) as typeof fetch;
    const result = await importKnowledgeUrl('http://127.0.0.1/admin', { fetchImpl });
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'private_address');
    assert.equal(called, false);
});

test('rejects when the request fails', async () => {
    const fetchImpl: typeof fetch = fromAny(async () => { throw new Error('network down'); });
    const result = await importKnowledgeUrl('https://example.com/page', { fetchImpl, dnsLookup: dnsFor('example.com') });
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'request_failed');
});

test('rejects a non-2xx response', async () => {
    const fetchImpl: typeof fetch = fromAny(async () => new Response('not found', { status: 404 }));
    const result = await importKnowledgeUrl('https://example.com/missing', { fetchImpl, dnsLookup: dnsFor('example.com') });
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'request_failed');
});

test('rejects a page with no extractable content', async () => {
    const fetchImpl: typeof fetch = fromAny(async () => new Response('<html><head></head><body></body></html>'));
    const result = await importKnowledgeUrl('https://example.com/empty', { fetchImpl, dnsLookup: dnsFor('example.com') });
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'empty_content');
});

test('normalizes a real page into a ready document', async () => {
    const fetchImpl: typeof fetch = fromAny(async () => new Response('<html><body><h1>Title</h1><p>Hello world</p></body></html>'));
    const result = await importKnowledgeUrl('https://example.com/page', { fetchImpl, dnsLookup: dnsFor('example.com') });
    assert.equal(result.status, 'ready');
    assert.ok(result.document);
    assert.equal(result.document?.sourceType, 'manual');
    assert.match(result.document?.content ?? '', /Hello world/);
});
