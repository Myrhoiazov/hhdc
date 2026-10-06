import 'dotenv/config';
import server from './app';
import prisma from '../prisma/prisma-client';
import { startBackgroundWorkers } from './modules/outbox/outbox.worker';

const start = async () => {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
    await prisma.$connect();
    server.listen(Number(process.env.PORT ?? 3001), () => console.log('HHDC CRM server started'));
    // Set BACKGROUND_WORKERS=off on web instances when a dedicated worker process (worker.ts) runs.
    if (process.env.BACKGROUND_WORKERS !== 'off') startBackgroundWorkers();
};
const stop = () => server.close(() => { void prisma.$disconnect().then(() => process.exit(0)); });
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
void start().catch((e) => { console.error('CRM startup failed', e); process.exitCode = 1; });
