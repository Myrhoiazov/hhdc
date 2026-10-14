import { readApiKey, readWebhook } from './readPlatformForms';

const formOf = (entries: Array<[string, string]>) => {
    const form = new FormData();
    entries.forEach(([name, value]) => form.append(name, value));
    return form;
};

test('an API key takes the permissions written with commas, without empty ones', () => {
    const form = formOf([
        ['name', 'Website'],
        ['permissions', ' events.read, people.read ,,'],
    ]);

    expect(readApiKey(form)).toEqual({
        name: 'Website',
        permissions: ['events.read', 'people.read'],
    });
});

test('a webhook takes every chosen event', () => {
    const form = formOf([
        ['name', 'Zapier'],
        ['url', 'https://hooks.example.test'],
        ['events', 'person.created'],
        ['events', 'payment.paid'],
    ]);

    expect(readWebhook(form)).toEqual({
        name: 'Zapier',
        url: 'https://hooks.example.test',
        events: ['person.created', 'payment.paid'],
    });
});
