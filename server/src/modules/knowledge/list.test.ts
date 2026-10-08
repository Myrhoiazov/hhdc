import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knowledgeFiltersSchema, knowledgeWhere } from './list';

test('without filters every document is listed', () => {
    assert.deepEqual(knowledgeWhere(knowledgeFiltersSchema.parse({ q: '', scope: '', status: '', page: '2', pageSize: '25' })), {});
});

test('the title is searched ignoring case, together with scope and status', () => {
    assert.deepEqual(knowledgeWhere(knowledgeFiltersSchema.parse({ q: ' tone ', scope: 'GLOBAL', status: 'ACTIVE' })),
        { title: { contains: 'tone', mode: 'insensitive' }, scope: 'GLOBAL', status: 'ACTIVE' });
});

test('an unknown scope or status is refused', () => {
    assert.throws(() => knowledgeFiltersSchema.parse({ scope: 'PLANET' }));
    assert.throws(() => knowledgeFiltersSchema.parse({ status: 'DELETED' }));
});
