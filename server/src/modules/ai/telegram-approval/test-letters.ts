import 'dotenv/config';
import prisma from '../../../../prisma/prisma-client';
import type { NormalizedEmail } from '../../../integrations/email/EmailProvider';
import { ingestEmail } from '../../communications/ingest';

// Acceptance run of the approval flow: stores a few made-up incoming letters exactly as a mailbox
// sync would, and reports what the running server did with each — draft, Telegram message, spam.
//
//   npm run test:approval-letters -- --from=you@example.com
//
// Use an address you read yourself: pressing "Send" in Telegram mails the reply to it.

interface TestLetter { name: string; subject: string; body: string; expect: string }

export const TEST_LETTERS: TestLetter[] = [
    { name: 'level', subject: '[TEST] Do I need a certain level?', expect: 'draft',
        body: 'Hi,\n\nI am interested in your high heels dance camp. Is there a certain level I must dance at to attend the classes?\n\nThank you' },
    { name: 'price', subject: '[TEST] Ticket prices and dates', expect: 'draft',
        body: 'Hello! When does the camp take place and how much is a full pass? Are there still tickets left?\n\nBest, Anna' },
    { name: 'refund', subject: '[TEST] I cannot come — refund?', expect: 'draft that needs a person',
        body: 'Hi, I bought a ticket but I broke my ankle and cannot come. Can I get a refund or give my ticket to a friend?' },
    { name: 'spam', subject: '[TEST] Boost your website traffic — SEO offer', expect: 'spam, nothing in Telegram',
        body: 'Dear website owner, we offer cheap SEO backlinks and guaranteed first page ranking on Google. Reply now to get 50% discount on our marketing package. Unsubscribe here.' },
];

// A local model on CPU needs a couple of minutes per letter.
const WAIT_MS = 15 * 60_000;
const CHECK_EVERY_MS = 5_000;

const argument = (name: string): string | undefined => process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const pause = (ms: number): Promise<void> => new Promise(resolve => { setTimeout(resolve, ms); });

const pickMailbox = async (name?: string) => {
    const mailbox = await prisma.providerConnection.findFirst({
        where: { type: 'EMAIL', status: 'CONNECTED', ...(name ? { name } : {}) }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, settings: true },
    });
    if (!mailbox) throw new Error(name ? `No connected mailbox is called "${name}"` : 'No connected mailbox');
    return mailbox;
};

const toEmail = (letter: TestLetter, run: string, from: string, to: string): NormalizedEmail => ({
    externalId: `<test-${run}-${letter.name}@hhdc-test.local>`, threadId: `<test-${run}-${letter.name}@hhdc-test.local>`,
    sender: from, recipient: to, subject: letter.subject, bodyText: letter.body, receivedAt: new Date(), isRead: false,
});

const outcomeOf = async (messageId: string): Promise<string | null> => {
    const message = await prisma.message.findUnique({ where: { id: messageId }, select: { classification: true } });
    const classification = message?.classification as { spam?: boolean; needsReply?: boolean } | null | undefined;
    if (!classification) return null;
    const draft = await prisma.aiDraft.findFirst({ where: { sourceMessageId: messageId }, orderBy: { createdAt: 'desc' }, select: { id: true, contextSnapshot: true } });
    if (!draft) return classification.spam ? 'spam — no draft, nothing sent to Telegram' : 'no reply needed — no draft';
    const posted = await prisma.auditLog.count({ where: { action: 'AI_DRAFT_APPROVAL_REQUESTED', entityType: 'AiDraft', entityId: draft.id } });
    const review = (draft.contextSnapshot as { needsStaffReview?: boolean } | null)?.needsStaffReview ? ' (needs a person)' : '';
    return posted ? `draft${review} — posted to Telegram` : `draft${review} — NOT posted to Telegram yet`;
};

const settled = (outcome: string | null): boolean => Boolean(outcome) && !outcome?.includes('NOT posted');

const report = async (sent: { letter: TestLetter; messageId: string }[]): Promise<void> => {
    const deadline = Date.now() + WAIT_MS;
    let outcomes: (string | null)[] = [];
    while (Date.now() < deadline) {
        outcomes = await Promise.all(sent.map(item => outcomeOf(item.messageId)));
        if (outcomes.every(settled)) break;
        await pause(CHECK_EVERY_MS);
    }
    sent.forEach((item, index) => console.log(`${item.letter.name.padEnd(7)} expected: ${item.letter.expect.padEnd(28)} got: ${outcomes[index] ?? 'not processed in time'}`));
};

const run = async (): Promise<void> => {
    const from = argument('from');
    if (!from?.includes('@')) throw new Error('Pass the address the test letters come from: --from=you@example.com');
    const mailbox = await pickMailbox(argument('mailbox'));
    const to = String((mailbox.settings as { sender?: unknown } | null)?.sender ?? 'info@hhdc-test.local');
    const stamp = Date.now().toString(36);
    const sent = [];
    for (const letter of TEST_LETTERS) {
        const stored = await ingestEmail(mailbox.id, toEmail(letter, stamp, from.toLowerCase(), to));
        sent.push({ letter, messageId: stored.message.id });
    }
    console.log(`Stored ${sent.length} test letters from ${from} in mailbox "${mailbox.name}". Waiting for the server to handle them…`);
    await report(sent);
};

if (require.main === module) {
    void run().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
