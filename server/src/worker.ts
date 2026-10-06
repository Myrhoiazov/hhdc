import 'dotenv/config';
import prisma from '../prisma/prisma-client';
import { startBackgroundWorkers } from './modules/outbox/outbox.worker';

// Dedicated worker process: same codebase/image as the web process, different command.
const start = async () => {
    await prisma.$connect();
    const stop = startBackgroundWorkers();
    const timer = setInterval(() => undefined, 60_000);
    const shutdown = () => { stop(); clearInterval(timer); void prisma.$disconnect().then(() => process.exit(0)); };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    console.log('HHDC CRM worker started');
};
void start().catch((error) => { console.error('Worker startup failed', error); process.exitCode = 1; });
