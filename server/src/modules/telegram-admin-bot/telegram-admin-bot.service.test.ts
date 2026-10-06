import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTelegramAdminBotUpdate, type TelegramAdminBotDeps } from './telegram-admin-bot.service';
import type { TelegramInlineKeyboard, TelegramSentMessage } from '../../common/telegram/telegram-bot-api.client';

const admin = { userId: 5, email: 'admin@ddc.nl', firstName: 'Anna', lastName: 'K' };
const MINI_APP_URL = 'https://hhdc.denys-myr.com/telegram-admin/index.html';
const BOT_USERNAME = 'denysmyr_bot';

const makeDeps = (overrides: Partial<TelegramAdminBotDeps> = {}): TelegramAdminBotDeps & {
    sent: Array<{ chatId: unknown; text: string; inlineKeyboard?: TelegramInlineKeyboard }>;
    answered: Array<{ callbackQueryId: string; text?: string; showAlert?: boolean }>;
} => {
    const sent: Array<{ chatId: unknown; text: string; inlineKeyboard?: TelegramInlineKeyboard }> = [];
    const answered: Array<{ callbackQueryId: string; text?: string; showAlert?: boolean }> = [];

    return {
        resolveAdmin: async () => admin,
        send: async (params): Promise<TelegramSentMessage> => {
            sent.push({ chatId: params.chatId, text: params.text, inlineKeyboard: params.inlineKeyboard });
            return { message_id: 100 + sent.length, chat: { id: 1 } };
        },
        answerCallback: async (params): Promise<void> => { answered.push(params); },
        sent,
        answered,
        ...overrides,
    };
};

test.beforeEach(() => {
    process.env.TELEGRAM_MINIAPP_URL = MINI_APP_URL;
    process.env.TELEGRAM_BOT_USERNAME = BOT_USERNAME;
});

test('unauthorized user gets no CRM data and a plain rejection on /start', async () => {
    const deps = makeDeps({ resolveAdmin: async () => null });
    await handleTelegramAdminBotUpdate({ message: { text: '/start', from: { id: 999 }, chat: { id: 1, type: 'private' } } }, deps);
    assert.equal(deps.sent.length, 1);
    assert.match(deps.sent[0].text, /нет доступа/i);
});

test('unauthorized callback gets an alert answer, not the requested action', async () => {
    const deps = makeDeps({ resolveAdmin: async () => null });
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', from: { id: 999 }, message: { chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.sent.length, 0);
    assert.equal(deps.answered.length, 1);
    assert.equal(deps.answered[0].showAlert, true);
});

test('an authorized callback (e.g. a stale pre-rollout menu tap) is just dismissed', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', from: { id: 1 }, message: { chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.sent.length, 0);
    assert.equal(deps.answered.length, 1);
    assert.equal(deps.answered[0].showAlert, undefined);
});

test('/start in a private chat shows the root menu with web_app buttons deep-linking into the Mini App', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({ message: { text: '/start', from: { id: 1 }, chat: { id: 1, type: 'private' } } }, deps);

    assert.equal(deps.sent.length, 1);
    assert.match(deps.sent[0].text, /DDC ADMIN/);

    const buttons = (deps.sent[0].inlineKeyboard ?? []).flat();
    assert.equal(buttons.length, 3);
    for (const button of buttons) {
        assert.ok('web_app' in button, `expected a web_app button, got ${JSON.stringify(button)}`);
    }
    const urls = buttons.map((button) => ('web_app' in button ? button.web_app.url : ''));
    assert.ok(urls.includes(`${MINI_APP_URL}?screen=dashboard`));
    assert.ok(urls.includes(`${MINI_APP_URL}?screen=search`));
    assert.ok(urls.includes(`${MINI_APP_URL}?screen=new-student`));
});

test('/start in a private chat replies with a config error instead of crashing when TELEGRAM_MINIAPP_URL is unset', async () => {
    delete process.env.TELEGRAM_MINIAPP_URL;
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({ message: { text: '/start', from: { id: 1 }, chat: { id: 1, type: 'private' } } }, deps);
    assert.equal(deps.sent.length, 1);
    assert.match(deps.sent[0].text, /TELEGRAM_MINIAPP_URL/);
});

test('/start in a group sends a url deep link into a private chat instead of a web_app button', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        message: { text: '/start', from: { id: 1 }, chat: { id: -1004310025484, type: 'supergroup' } },
    }, deps);

    assert.equal(deps.sent.length, 1);
    const buttons = (deps.sent[0].inlineKeyboard ?? []).flat();
    assert.equal(buttons.length, 1);
    const [button] = buttons;
    assert.ok('url' in button, `expected a url button (web_app is invalid outside private chats), got ${JSON.stringify(button)}`);
    if ('url' in button) assert.equal(button.url, `https://t.me/${BOT_USERNAME}?start=menu`);
});

test('/start in a group replies with a config error instead of crashing when TELEGRAM_BOT_USERNAME is unset', async () => {
    delete process.env.TELEGRAM_BOT_USERNAME;
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        message: { text: '/start', from: { id: 1 }, chat: { id: -1004310025484, type: 'supergroup' } },
    }, deps);
    assert.equal(deps.sent.length, 1);
    assert.match(deps.sent[0].text, /TELEGRAM_BOT_USERNAME/);
});

test('unrelated text from an authorized admin is a safe no-op', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({ message: { text: 'hello', from: { id: 1 }, chat: { id: 1, type: 'private' } } }, deps);
    assert.equal(deps.sent.length, 0);
});
