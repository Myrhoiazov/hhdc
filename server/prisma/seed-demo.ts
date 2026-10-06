import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemoEvent() {
    return prisma.event.upsert({
        where: { slug: 'demo-dance-camp' },
        create: {
            name: 'Demo Dance Camp', slug: 'demo-dance-camp', timezone: 'Europe/Amsterdam',
            startAt: new Date('2027-07-01T08:00:00Z'), endAt: new Date('2027-07-03T18:00:00Z'),
            status: 'DRAFT', city: 'Amsterdam', country: 'NL', capacity: 100,
        },
        update: {},
    });
}

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.MODE === 'production') {
        throw new Error('Demo seed is disabled in production.');
    }
    if (process.env.SEED_DEMO !== 'true') throw new Error('Set SEED_DEMO=true to explicitly create demonstration data.');
    const event = await seedDemoEvent();
    await prisma.knowledgeDocument.create({
        data: { title: 'Demo event information', eventId: event.id, scope: 'EVENT', status: 'ACTIVE', content: 'Demonstration event. Replace this content with approved event information.' },
    });
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
