import assert from 'node:assert/strict';
import test from 'node:test';
import {
    answerTelegramCallbackQuery, editTelegramBotMessageText, sendTelegramBotMessage,
} from './telegram-bot-api.client';

const withToken = async (fn: () => Promise<void>) => {
    const previous = process.env.TELEGRAM_TOKEN;
    process.env.TELEGRAM_TOKEN = 'test-token';
    try {
        await fn();
    } finally {
        if (previous === undefined) delete process.env.TELEGRAM_TOKEN;
        else process.env.TELEGRAM_TOKEN = previous;
    }
};

test('sendTelegramBotMessage posts to the configured bot token and returns the sent message', async () => {
    await withToken(async () => {
        const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
        const result = await sendTelegramBotMessage(
            { chatId: '123', text: 'hello', inlineKeyboard: [[{ text: 'A', callback_data: 'adm:a' }]] },
            async (url, init) => {
                calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
                return new Response(JSON.stringify({ ok: true, result: { message_id: 42, chat: { id: 123 } } }), { status: 200 });
            },
        );
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, 'https://api.telegram.org/bottest-token/sendMessage');
        assert.equal(calls[0].body.chat_id, '123');
        assert.deepEqual(calls[0].body.reply_markup, { inline_keyboard: [[{ text: 'A', callback_data: 'adm:a' }]] });
        assert.equal(result.message_id, 42);
    });
});

test('sendTelegramBotMessage throws when Telegram reports ok:false', async () => {
    await withToken(async () => {
        await assert.rejects(
            sendTelegramBotMessage({ chatId: '1', text: 'x' }, async () => new Response(JSON.stringify({ ok: false, description: 'boom' }), { status: 400 })),
            /boom/,
        );
    });
});

test('editTelegramBotMessageText treats "message is not modified" as success, not an error', async () => {
    await withToken(async () => {
        await assert.doesNotReject(editTelegramBotMessageText(
            { chatId: '1', messageId: 5, text: 'same' },
            async () => new Response(JSON.stringify({ ok: false, description: 'Bad Request: message is not modified' }), { status: 400 }),
        ));
    });
});

test('editTelegramBotMessageText throws on other failures', async () => {
    await withToken(async () => {
        await assert.rejects(editTelegramBotMessageText(
            { chatId: '1', messageId: 5, text: 'x' },
            async () => new Response(JSON.stringify({ ok: false, description: 'message to edit not found' }), { status: 400 }),
        ), /not found/);
    });
});

test('answerTelegramCallbackQuery never throws even when the request fails', async () => {
    await withToken(async () => {
        await assert.doesNotReject(answerTelegramCallbackQuery(
            { callbackQueryId: 'q1' },
            async () => { throw new Error('network down'); },
        ));
    });
});

test('sendTelegramBotMessage throws when TELEGRAM_TOKEN is not configured', async () => {
    const previous = process.env.TELEGRAM_TOKEN;
    delete process.env.TELEGRAM_TOKEN;
    try {
        await assert.rejects(sendTelegramBotMessage({ chatId: '1', text: 'x' }, async () => new Response('{}')), /TELEGRAM_TOKEN/);
    } finally {
        if (previous !== undefined) process.env.TELEGRAM_TOKEN = previous;
    }
});
