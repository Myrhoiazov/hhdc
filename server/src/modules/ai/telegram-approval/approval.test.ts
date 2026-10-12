import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchUpdates, sendBotMessage, webhookUrl } from '../../../integrations/telegram/bot';
import { handleApprovalPress, parseApprovers, type ApprovalDeps, type ApprovalDraft } from './actions';
import { buildCallbackData, parseCallbackData } from './callback';
import { buildApprovalMessage, isPublicLink, sourceLabel, type ApprovalRequest } from './message';
import { pollOnce } from './polling';
import { toApprovalRequest } from './request';

const DRAFT_ID = '3f0c1c1e-6c1f-4f7e-9a50-0d5c7a4a2b11';
const draft: ApprovalDraft = { id: DRAFT_ID, status: 'GENERATED', content: 'Hi Anna, no level is required.', conversationId: 'conversation-1' };

const request: ApprovalRequest = {
    draftId: DRAFT_ID, sender: 'anna@example.test', senderName: 'Anna <b>', mailbox: 'Info', subject: 'Level?', incoming: 'Is there a <minimum> level?',
    draft: draft.content, language: 'en', intent: 'GENERAL', confidence: 0.82, needsStaffReview: false, warnings: [],
    sources: ['kb-v2://hhdc-knowledge-v1/02_event/levels.md', 'kb-v2://hhdc-knowledge-v1/02_event/levels.md'], link: 'https://crm.hhdc.test/email',
};

interface Calls { done: string[]; answers: { text: string; alert?: boolean }[]; finished: string[] }

const fakeDeps = (stored: ApprovalDraft | null, calls: Calls, overrides: Partial<ApprovalDeps> = {}): ApprovalDeps => ({
    approvers: new Map([['111', 'inna@hhdc.test']]),
    findUserId: async () => 'user-1',
    loadDraft: async () => stored,
    approve: async () => { calls.done.push('approve'); },
    reject: async () => { calls.done.push('reject'); },
    markSpam: async () => { calls.done.push('spam'); },
    answer: async (_id, text, alert) => { calls.answers.push({ text, alert }); },
    finish: async (_message, text) => { calls.finished.push(text); },
    ...overrides,
});

const press = (action: 'approve' | 'reject' | 'spam', actorId = 111, content = draft.content) => ({
    id: 'callback-1', data: buildCallbackData(DRAFT_ID, action, content), from: { id: actorId, first_name: 'Inna' }, message: { message_id: 7, chat: { id: -100 } },
});
const newCalls = (): Calls => ({ done: [], answers: [], finished: [] });

test('a button carries the draft, the action and the text it was shown with, within the Telegram limit', () => {
    const data = buildCallbackData(DRAFT_ID, 'approve', draft.content);
    assert.ok(Buffer.byteLength(data) <= 64);
    assert.deepEqual(parseCallbackData(data), { draftId: DRAFT_ID, action: 'approve', stamp: data.slice(-8) });
    assert.equal(parseCallbackData('ai:draft:1:2:approve'), null);
    assert.equal(parseCallbackData(undefined), null);
});

test('the approval message shows the letter and the draft with safe markup, and the buttons', () => {
    const message = buildApprovalMessage(request);
    assert.match(message.text, /Anna &lt;b&gt; &lt;anna@example.test&gt;/);
    assert.match(message.text, /Is there a &lt;minimum&gt; level\?/);
    assert.match(message.text, /уверенность 82%/);
    assert.equal(message.text.match(/02_event\/levels.md/g)?.length, 1);
    assert.doesNotMatch(message.text, /Нужна проверка/);
    assert.deepEqual(message.keyboard.flat().map(button => button.text), ['✅ Отправить', '❌ Отклонить', '🚫 Спам', '✏️ Открыть в CRM']);
    assert.ok(message.text.length < 4096);
});

test('a draft that needs a person says why, and a very long letter still fits one message', () => {
    const long = buildApprovalMessage({ ...request, needsStaffReview: true, warnings: ['staff_action_required'], incoming: 'x'.repeat(9000), draft: 'y'.repeat(9000) });
    assert.match(long.text, /Нужна проверка человеком<\/b>: staff_action_required/);
    assert.ok(long.text.length < 4096);
});

test('a CRM that is only reachable locally is named in the text instead of a button', () => {
    const local = buildApprovalMessage({ ...request, link: 'http://localhost:3011/email' });
    assert.equal(local.keyboard.flat().length, 3);
    assert.match(local.text, /Изменить текст: http:\/\/localhost:3011\/email/);
    assert.equal(isPublicLink('https://crm.hhdc.test/email'), true);
    assert.equal(isPublicLink('https://localhost/email'), false);
    assert.equal(sourceLabel('kb-v2://hhdc-knowledge-v1/01_brand/contacts.md'), '01_brand/contacts.md');
});

test('what is stored with a draft becomes the approval request', () => {
    const stored = {
        id: DRAFT_ID, content: 'Reply', language: 'en', intent: 'PRICING', confidence: 0.7,
        contextSnapshot: { needsStaffReview: false, warnings: ['w1', 3], knowledgeUsed: [{ sourceUrl: 'kb-v2://kb/a.md' }, { id: 'no-url' }] },
        conversation: { subject: 'Prices', person: { displayName: 'anna@example.test' } },
        sourceMessage: { sender: 'anna@example.test', bodyText: 'How much?', providerConnection: { name: 'Info' } },
    };
    const result = toApprovalRequest(stored, '');
    assert.equal(result.senderName, null);
    assert.equal(result.mailbox, 'Info');
    assert.deepEqual(result.warnings, ['w1']);
    assert.deepEqual(result.sources, ['kb-v2://kb/a.md']);
    assert.equal(toApprovalRequest({ ...stored, contextSnapshot: null }, '').needsStaffReview, true);
});

test('an approver sends, rejects or marks spam with one press, and the chat is told', async () => {
    for (const action of ['approve', 'reject', 'spam'] as const) {
        const calls = newCalls();
        assert.equal(await handleApprovalPress(press(action), fakeDeps(draft, calls)), action);
        assert.deepEqual(calls.done, [action]);
        assert.equal(calls.answers[0].alert, undefined);
        assert.match(calls.finished[0], /— Inna$/);
    }
});

test('someone who is not an approver is refused and told their Telegram id', async () => {
    const calls = newCalls();
    assert.equal(await handleApprovalPress(press('approve', 999), fakeDeps(draft, calls)), 'refused');
    assert.deepEqual(calls.done, []);
    assert.match(calls.answers[0].text, /Ваш Telegram ID: 999/);
    assert.equal(calls.answers[0].alert, true);
});

test('a press on a handled draft, or on one edited in the CRM since, does nothing', async () => {
    const handled = newCalls();
    assert.equal(await handleApprovalPress(press('approve'), fakeDeps({ ...draft, status: 'SENT' }, handled)), 'refused');
    assert.match(handled.answers[0].text, /уже обработано/);
    const edited = newCalls();
    assert.equal(await handleApprovalPress(press('approve', 111, 'the text shown in Telegram'), fakeDeps(draft, edited)), 'refused');
    assert.match(edited.answers[0].text, /изменён в CRM/);
    assert.deepEqual([...handled.done, ...edited.done], []);
});

test('a failed send is reported to the person and leaves the message with its buttons', async () => {
    const calls = newCalls();
    const outcome = await handleApprovalPress(press('approve'), fakeDeps(draft, calls, { approve: async () => { throw new Error('Provider did not confirm delivery'); } }));
    assert.equal(outcome, 'refused');
    assert.match(calls.answers[0].text, /Не получилось: Provider did not confirm delivery/);
    assert.deepEqual(calls.finished, []);
});

test('a press that belongs to another bot feature is ignored', async () => {
    const calls = newCalls();
    assert.equal(await handleApprovalPress({ id: 'c', data: 'ai:draft:5:1:approve', from: { id: 111 } }, fakeDeps(draft, calls)), 'ignored');
    assert.deepEqual(calls.answers, []);
});

test('approvers are read as Telegram id and staff email pairs; malformed pairs are dropped', () => {
    assert.deepEqual([...parseApprovers(' 111:Inna@HHDC.test , 222:denys@hhdc.test, nope, 333:, :x@y.z ')], [['111', 'inna@hhdc.test'], ['222', 'denys@hhdc.test']]);
    assert.equal(parseApprovers(undefined).size, 0);
});

test('every update is acknowledged, even one whose press failed', async () => {
    const pressed: string[] = [];
    const next = await pollOnce(10, {
        fetch: async offset => { assert.equal(offset, 10); return [{ update_id: 10, callback_query: { id: 'a' } }, { update_id: 11 }, { update_id: 12, callback_query: { id: 'b' } }]; },
        press: async callback => { pressed.push(callback.id); if (callback.id === 'a') throw new Error('boom'); },
    });
    assert.equal(next, 13);
    assert.deepEqual(pressed, ['a', 'b']);
    assert.equal(await pollOnce(5, { fetch: async () => [], press: async () => undefined }), 5);
});

const telegramReplying = (result: unknown, seen: { url: string; body: Record<string, unknown> }[]): typeof fetch =>
    (async (url: unknown, init?: { body?: unknown }) => {
        seen.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
        return { status: 200, json: async () => (result === null ? { ok: false, description: 'chat not found' } : { ok: true, result }) };
    }) as unknown as typeof fetch;

test('the bot sends a message with its buttons and reports what Telegram refused', async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = [];
    const bot = { token: 'test-token', fetchImpl: telegramReplying({ message_id: 42 }, seen) };
    assert.equal(await sendBotMessage(bot, { chatId: '-100', text: 'hi', keyboard: [[{ text: 'ok', callback_data: 'x' }]] }), 42);
    assert.match(seen[0].url, /\/bottest-token\/sendMessage$/);
    assert.deepEqual(seen[0].body.reply_markup, { inline_keyboard: [[{ text: 'ok', callback_data: 'x' }]] });
    await assert.rejects(sendBotMessage({ token: 'test-token', fetchImpl: telegramReplying(null, []) }, { chatId: '1', text: 'hi' }), /chat not found/);
});

test('the bot asks only for button presses and tells where a webhook points', async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = [];
    assert.deepEqual(await fetchUpdates({ token: 'test-token', fetchImpl: telegramReplying([], seen) }, 7), []);
    assert.deepEqual(seen[0].body, { timeout: 25, allowed_updates: ['callback_query'], offset: 7 });
    assert.equal(await webhookUrl({ token: 'test-token', fetchImpl: telegramReplying({ url: 'https://other.test/hook' }, []) }), 'https://other.test/hook');
    assert.equal(await webhookUrl({ token: 'test-token', fetchImpl: telegramReplying({}, []) }), '');
});
