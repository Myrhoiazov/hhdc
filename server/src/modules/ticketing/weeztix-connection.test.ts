import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseCompany, connectSchema } from './weeztix-connection.service';

const companies = [{ guid: 'c-1', name: 'HHDC' }, { guid: 'c-2', name: 'Other' }];

test('the first company is used unless one is asked for; an unknown company is refused', () => {
    assert.deepEqual(chooseCompany(companies), companies[0]);
    assert.deepEqual(chooseCompany(companies, 'c-2'), companies[1]);
    assert.throws(() => chooseCompany(companies, 'c-3'), /no access to that company/);
    assert.equal(chooseCompany([]), null);
});

test('connecting needs the pasted address and accepts nothing else', () => {
    assert.equal(connectSchema.parse({ address: ' https://example.test/?code=a&state=b ' }).address, 'https://example.test/?code=a&state=b');
    assert.throws(() => connectSchema.parse({ address: '' }));
    assert.throws(() => connectSchema.parse({ address: 'x', clientSecret: 'y' }));
});
