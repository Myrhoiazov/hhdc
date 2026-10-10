import { PrismaClient } from '@prisma/client';

const E2E_DATABASE = 'hhdc_crm_e2e';
const prisma = new PrismaClient();

// Letters that came from no connected mailbox: the CRM can remove them without a mail provider.
const LETTERS = [
    { subject: 'E2E ticket question', sender: 'ada@example.test', bodyText: 'Can I still buy a ticket?' },
    { subject: 'E2E prize offer', sender: 'promo@example.test', bodyText: 'You have won a prize.' },
    { subject: 'E2E hotel booking', sender: 'grace@example.test', bodyText: 'Which hotel is closest to the venue?' },
];

// The fixtures must never reach a real database, whatever DATABASE_URL happens to be set.
const assertE2eDatabase = () => {
    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
    if (database !== E2E_DATABASE) throw new Error(`E2E fixtures are only for the ${E2E_DATABASE} database.`);
};

const seedLetters = async () => {
    for (const [index, letter] of LETTERS.entries()) {
        const receivedAt = new Date(Date.UTC(2026, 9, 1 + index, 9));
        await prisma.conversation.create({ data: {
            subject: letter.subject, lastMessageAt: receivedAt,
            messages: { create: {
                direction: 'INBOUND', sender: letter.sender, recipient: 'info@example.test',
                subject: letter.subject, bodyText: letter.bodyText, receivedAt, isRead: true,
            } },
        } });
    }
};

// Two AI providers that are never called: the suite only switches which of them writes answers.
const AI_PROVIDERS = [
    { name: 'E2E local model', provider: 'OLLAMA' as const, model: 'e2e-local', createdAt: new Date(Date.UTC(2026, 9, 1)) },
    { name: 'E2E cloud model', provider: 'OPENAI' as const, model: 'e2e-cloud', createdAt: new Date(Date.UTC(2026, 9, 2)) },
];

const seedAiProviders = async () => {
    for (const { model, ...connection } of AI_PROVIDERS) {
        await prisma.providerConnection.create({ data: { ...connection, type: 'AI', status: 'CONNECTED', settings: { model } } });
    }
};

async function main() {
    assertE2eDatabase();
    await seedLetters();
    await seedAiProviders();
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
