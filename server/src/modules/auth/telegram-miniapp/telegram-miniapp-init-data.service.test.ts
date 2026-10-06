import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { verifyTelegramInitData } from './telegram-miniapp-init-data.service';

const BOT_TOKEN = 'test-token:ABCDEF';

// Mirrors Telegram's own client-side signing algorithm independently of the
// implementation under test, so this fixture proves our verifier accepts
// what a real Telegram client would actually send.
const signInitData = (fields: Record<string, string>, botToken: string): string => {
    const dataCheckString = Object.keys(fields)
        .sort()
        .map((key) => `${key}=${fields[key]}`)
        .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return new URLSearchParams({ ...fields, hash }).toString();
};

const validFields = (authDateSeconds: number) => ({
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify({ id: 123456789, first_name: 'Anna', last_name: 'K', username: 'anna_k' }),
    auth_date: String(authDateSeconds),
});

test('accepts a correctly signed, fresh initData string', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = signInitData(validFields(nowSeconds), BOT_TOKEN);

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.telegramUserId, '123456789');
        assert.equal(result.firstName, 'Anna');
        assert.equal(result.username, 'anna_k');
    }
});

test('rejects a tampered payload (hash no longer matches)', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = signInitData(validFields(nowSeconds), BOT_TOKEN);
    const tampered = initData.replace('Anna', 'Mallory');

    const result = verifyTelegramInitData(tampered, BOT_TOKEN);

    assert.equal(result.ok, false);
});

test('rejects a signature produced with a different bot token', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = signInitData(validFields(nowSeconds), 'a-different-token:XYZ');

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, false);
});

test('rejects initData older than 24 hours', () => {
    const twoDaysAgoSeconds = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const initData = signInitData(validFields(twoDaysAgoSeconds), BOT_TOKEN);

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /expired|old/i);
});

test('rejects initData with no hash field at all', () => {
    const result = verifyTelegramInitData('query_id=abc&auth_date=123', BOT_TOKEN);
    assert.equal(result.ok, false);
});

test('rejects initData whose user field is not valid JSON', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const fields = { ...validFields(nowSeconds), user: 'not-json' };
    const initData = signInitData(fields, BOT_TOKEN);

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, false);
});

const malformedUsers: unknown[] = [null, [], { id: -1 }, { id: 1.5 }, { id: 9007199254740992 }];
for (const user of malformedUsers) {
    test(`rejects malformed user ${JSON.stringify(user)} without throwing`, () => {
        const fields = { ...validFields(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) };
        assert.equal(verifyTelegramInitData(signInitData(fields, BOT_TOKEN), BOT_TOKEN).ok, false);
    });
}
test('rejects a valid hash with trailing non-hex characters', () => {
    const data = signInitData(validFields(Math.floor(Date.now() / 1000)), BOT_TOKEN);
    assert.equal(verifyTelegramInitData(data + 'zz', BOT_TOKEN).ok, false);
});
test('rejects duplicate signed fields', () => {
    const fields = validFields(Math.floor(Date.now() / 1000));
    const data = signInitData(fields, BOT_TOKEN);
    const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const params = new URLSearchParams(data);
    params.delete('hash');
    params.append('user', fields.user);
    const check = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
    assert.equal(verifyTelegramInitData(params.toString(), BOT_TOKEN).ok, false);
});
for (const authDate of ['bad', '1.5', String(Math.floor(Date.now() / 1000) + 120)]) {
    test(`rejects invalid or future auth_date ${authDate}`, () => {
        const fields = { ...validFields(1), auth_date: authDate };
        assert.equal(verifyTelegramInitData(signInitData(fields, BOT_TOKEN), BOT_TOKEN).ok, false);
    });
}
