import { listPrompts } from './promptApi';
import { listReplyPrompts } from './replyPrompts';

jest.mock('./promptApi', () => ({ listPrompts: jest.fn() }));

const version = (id: string, key: string) => ({ id, key, version: 1, purpose: '', systemPrompt: '', status: 'ACTIVE', createdAt: '' });

test('only the versions of the reply prompt are offered', async () => {
    jest.mocked(listPrompts).mockResolvedValue([version('a', 'email_draft_body'), version('b', 'email_classification')]);

    await expect(listReplyPrompts()).resolves.toEqual([version('a', 'email_draft_body')]);
});

test('somebody who may not see prompts gets an empty list instead of an error', async () => {
    jest.mocked(listPrompts).mockRejectedValue(new Error('Forbidden'));

    await expect(listReplyPrompts()).resolves.toEqual([]);
});
