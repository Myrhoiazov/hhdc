import test from 'node:test';
import assert from 'node:assert/strict';
import { MissingTemplateVariablesError, renderTemplate, templateVariables } from './template-render';

test('templates render nested variables', () => {
    assert.equal(renderTemplate('Hi {{ person.firstName }}, see you at {{event.name}}!', { person: { firstName: 'Anna' }, event: { name: 'LITO 2027' } }), 'Hi Anna, see you at LITO 2027!');
    assert.deepEqual(templateVariables('{{a.b}} {{a.b}} {{c}}'), ['a.b', 'c']);
});

test('rendering fails safely when a variable is missing instead of sending a broken message', () => {
    assert.throws(() => renderTemplate('Hi {{person.firstName}} {{event.name}}', { person: { firstName: '' } }), (error: unknown) =>
        error instanceof MissingTemplateVariablesError && error.missing.join() === 'person.firstName,event.name');
});

test('templates cannot read object prototypes', () => {
    assert.throws(() => renderTemplate('{{person.constructor.name}}', { person: {} }), MissingTemplateVariablesError);
});
