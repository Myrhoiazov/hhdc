import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planKbFile } from './kb-sync';

const file = { relativePath: '02_locations/rotterdam.md', title: 'Rotterdam', raw: '# Rotterdam\nStreet 1' };
const stored = (content: string, embedded = true) => ({ id: 'doc-1', sourceUrl: 'kb-v2://02_locations/rotterdam.md', content, embedded });

test('a new knowledge file is created and an unchanged one is left alone', () => {
    assert.equal(planKbFile(file, undefined, false), 'create');
    assert.equal(planKbFile(file, stored(file.raw), false), 'keep');
    assert.equal(planKbFile(file, stored(file.raw, false), false), 'embed');
});

test('a document edited in the CRM is replaced by its file only on request', () => {
    assert.equal(planKbFile(file, stored('# Rotterdam\nNew street 2'), false), 'skip-edited');
    assert.equal(planKbFile(file, stored('# Rotterdam\nNew street 2'), true), 'overwrite');
});
