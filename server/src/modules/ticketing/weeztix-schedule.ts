import prisma from '../../../prisma/prisma-client';
import { logger } from '../../common/logger';
import { syncWeeztixSales } from './weeztix-orders.service';

// Weeztix cannot call the CRM without a public https address, so the CRM asks: the background
// worker reads events, prices and orders on a schedule, the same way mailboxes are polled.

const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'unknown error');

export const syncAllWeeztixConnections = async (sync: (connectionId: string) => Promise<unknown> = syncWeeztixSales): Promise<number> => {
    // DISCONNECTED connections were never approved; ERROR ones keep retrying so they can recover.
    const connections = await prisma.providerConnection.findMany({ where: { provider: 'WEEZTIX', status: { in: ['CONNECTED', 'ERROR'] } }, select: { id: true, name: true } });
    for (const connection of connections) {
        try { await sync(connection.id); }
        catch (error) { logger.error(`[weeztix-sync] "${connection.name}" (${connection.id}) failed: ${errorText(error)}`); }
    }
    return connections.length;
};

export interface SweepOptions { intervalMs?: number; now?: number; sweep?: () => Promise<unknown>; env?: NodeJS.ProcessEnv }

const DEFAULT_INTERVAL_MS = 600_000;
let lastSweepAt = 0;
let sweeping = false;

// Called from the worker tick, which runs far more often than sales need to be read. A sweep
// that is still running is never started a second time.
export const syncWeeztixWhenDue = async (options: SweepOptions = {}): Promise<boolean> => {
    const env = options.env ?? process.env;
    const now = options.now ?? Date.now();
    const intervalMs = options.intervalMs ?? (Number(env.WEEZTIX_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS);
    if (env.WEEZTIX_SYNC_ENABLED === 'false' || sweeping || now - lastSweepAt < intervalMs) return false;
    lastSweepAt = now;
    sweeping = true;
    try { await (options.sweep ?? syncAllWeeztixConnections)(); }
    finally { sweeping = false; }
    return true;
};
