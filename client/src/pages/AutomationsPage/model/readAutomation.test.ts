import { readAutomation } from './readAutomation';

const formOf = (fields: Record<string, string>) => {
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.set(name, value));
    return form;
};

const FIELDS = {
    name: 'Welcome',
    triggerType: 'person.created',
    conditions: '{"all": []}',
    actionType: 'task.create',
    config: '{"title": "Call"}',
};

test('an automation has one action, with conditions and settings written as JSON', () => {
    expect(readAutomation(formOf(FIELDS))).toEqual({
        name: 'Welcome',
        triggerType: 'person.created',
        conditions: { all: [] },
        actions: [{ type: 'task.create', config: { title: 'Call' } }],
    });
});

test('conditions that are not JSON are refused', () => {
    expect(() => readAutomation(formOf({ ...FIELDS, conditions: '{all' }))).toThrow(SyntaxError);
});
