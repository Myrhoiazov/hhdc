import { formText } from './formText';

const formOf = (fields: Record<string, string>) => {
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.set(name, value));
    return form;
};

test('the text of a field comes without the spaces around it', () => {
    expect(formText(formOf({ name: '  Anna  ' }), 'name')).toBe('Anna');
});

test('a field the form does not have reads as empty text', () => {
    expect(formText(formOf({}), 'name')).toBe('');
});
