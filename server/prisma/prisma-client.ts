import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from '../src/common/logger';

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 100);

type QueryStats = { count: number; totalDurationMs: number };

export const queryStatsContext = new AsyncLocalStorage<QueryStats>();

const prisma = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (event) => {
    const stats = queryStatsContext.getStore();
    if (stats) {
        stats.count += 1;
        stats.totalDurationMs += event.duration;
    }
    if (event.duration >= SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(`[slow-query] ${event.duration}ms query="${event.query}"`);
    }
});

export default prisma;
