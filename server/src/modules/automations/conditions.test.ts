import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConditions, parseConditions, readField } from './conditions';
import { automationSchema, TOPIC_TRIGGERS, ACTION_TYPES } from './automation.schemas';

const context = { registration: { status: 'CONFIRMED' }, person: { language: 'en', tags: ['vip'] }, order: { total: 150 } };

test('all/any groups combine typed rules', () => {
    const tree = parseConditions({ all: [
        { field: 'registration.status', operator: 'eq', value: 'CONFIRMED' },
        { any: [{ field: 'person.language', operator: 'in', value: ['nl', 'en'] }, { field: 'order.total', operator: 'gt', value: 1000 }] },
        { field: 'person.tags', operator: 'contains', value: 'vip' },
    ] });
    assert.equal(evaluateConditions(tree, context), true);
    assert.equal(evaluateConditions(parseConditions({ field: 'order.total', operator: 'lte', value: 100 }), context), false);
});

test('missing fields never satisfy comparisons and empty conditions always match', () => {
    assert.equal(evaluateConditions(parseConditions({ field: 'event.name', operator: 'gt', value: 1 }), context), false);
    assert.equal(evaluateConditions(parseConditions({ field: 'event.name', operator: 'exists', value: false }), context), true);
    assert.equal(evaluateConditions(parseConditions({}), context), true);
});

test('conditions cannot traverse prototypes or use unknown operators', () => {
    assert.equal(readField(context, 'person.__proto__.polluted'), undefined);
    assert.throws(() => parseConditions({ field: 'person.language', operator: 'regex', value: '.*' }));
    assert.throws(() => parseConditions({ field: 'person["language"]', operator: 'eq', value: 'en' }));
});

test('automations accept only whitelisted actions with valid config', () => {
    const base = { name: 'Welcome', triggerType: 'REGISTRATION_CREATED' };
    assert.equal(automationSchema.parse({ ...base, actions: [{ type: 'ADD_TAG', config: { tagSlug: 'lito' } }] }).actions[0].type, 'ADD_TAG');
    assert.throws(() => automationSchema.parse({ ...base, actions: [{ type: 'REFUND_PAYMENT', config: {} }] }));
    assert.throws(() => automationSchema.parse({ ...base, actions: [{ type: 'ADD_TAG', config: {} }] }));
    assert.throws(() => automationSchema.parse({ ...base, actions: [] }));
});

test('dangerous actions are not available to automation and topics map to known triggers', () => {
    for (const forbidden of ['REFUND_PAYMENT', 'DELETE_PERSON', 'CHANGE_PERMISSIONS']) assert.equal((ACTION_TYPES as string[]).includes(forbidden), false);
    assert.equal(TOPIC_TRIGGERS['registration.created'], 'REGISTRATION_CREATED');
    assert.equal(TOPIC_TRIGGERS['campaign.send'], undefined);
});
