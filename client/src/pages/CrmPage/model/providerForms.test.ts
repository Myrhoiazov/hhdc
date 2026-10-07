import { buildProviderInput, providerFormFor } from './providerForms';

const mailbox = providerFormFor('IMAP')!;
const values = {
    name: ' Info ', username: 'info@hhdc.test', password: 'secret', imapHost: 'imap.hhdc.test', imapPort: '993',
    imapSecure: 'on', smtpHost: 'smtp.hhdc.test', smtpPort: '465', smtpSecure: null, sender: '',
};

test('a new mailbox sends typed settings and its credentials', () => {
    expect(buildProviderInput(mailbox, values)).toEqual({
        name: 'Info', type: 'EMAIL', provider: 'IMAP',
        credentials: { username: 'info@hhdc.test', password: 'secret' },
        settings: { imapHost: 'imap.hhdc.test', imapPort: 993, imapSecure: true, smtpHost: 'smtp.hhdc.test', smtpPort: 465, smtpSecure: false },
    });
});

test('editing without touching the secrets keeps the saved credentials', () => {
    const input = buildProviderInput(mailbox, { ...values, username: '', password: '' }, true);
    expect(input.credentials).toBeUndefined();
    expect(input.provider).toBeUndefined();
});

test('a partial credential replacement is refused', () => {
    expect(() => buildProviderInput(mailbox, { ...values, username: '' }, true)).toThrow('every credential field');
    expect(() => buildProviderInput(mailbox, { ...values, password: '' })).toThrow('every credential field');
});

test('a provider the server cannot verify is stored as connected', () => {
    const input = buildProviderInput(providerFormFor('OPENAI')!, { name: 'OpenAI', apiKey: 'k', model: 'gpt' });
    expect(input.status).toBe('CONNECTED');
    expect(buildProviderInput(mailbox, values).status).toBeUndefined();
});
