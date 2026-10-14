// An API key: its name and the permissions written in one field, separated by commas.
export const readApiKey = (form: FormData) => ({
    name: String(form.get('name')),
    permissions: String(form.get('permissions'))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
});

// A webhook: where it is sent and every event chosen in the list.
export const readWebhook = (form: FormData) => ({
    name: String(form.get('name')),
    url: String(form.get('url')),
    events: form.getAll('events').map(String),
});
