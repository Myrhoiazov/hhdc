import type { ProviderConnection, SyncRun } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { logger } from '../../common/logger';
import type { EmailSyncPage, NormalizedEmail } from '../../integrations/email/EmailProvider';
import { notifyEmailSyncFailed } from '../../integrations/telegram/notify';
import { ingestEmail } from './ingest';
import { emailProvider } from './send';

// A run that never finished (crashed process) stops blocking new runs after this long.
const STALE_RUN_MS = 10 * 60_000;

export interface EmailSyncSummary { created: number; skipped: number; failed: number }

export interface EmailSyncDeps {
    fetchPage(connectionId: string, cursor?: string): Promise<EmailSyncPage>;
    ingest(connectionId: string, email: NormalizedEmail): Promise<{ created: boolean }>;
}

const defaultDeps: EmailSyncDeps = {
    fetchPage: async (connectionId, cursor) => (await emailProvider(connectionId)).provider.syncMessages(cursor),
    ingest: ingestEmail,
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error').slice(0, 500);

// Persists every message of a page; one failing message never stops the others.
export const ingestPage = async (connectionId: string, page: EmailSyncPage, ingest: EmailSyncDeps['ingest']): Promise<EmailSyncSummary> => {
    const summary: EmailSyncSummary = { created: 0, skipped: page.skipped ?? 0, failed: 0 };
    for (const email of page.messages) {
        try {
            const result = await ingest(connectionId, email);
            if (result.created) summary.created += 1; else summary.skipped += 1;
        } catch (error) {
            summary.failed += 1;
            logger.error(`[email-sync] message ${email.externalId} of provider ${connectionId} was not stored: ${errorText(error)}`);
        }
    }
    return summary;
};

// The cursor only moves when the whole page was stored, so a transient database failure is
// retried on the next run; already stored messages are deduplicated by their external id.
export const cursorAfter = (previous: string | undefined, page: EmailSyncPage, summary: EmailSyncSummary): string | undefined =>
    (summary.failed === 0 ? page.cursor ?? previous : previous);

const requireSyncableConnection = async (connectionId: string): Promise<ProviderConnection> => {
    const connection = await prisma.providerConnection.findUnique({ where: { id: connectionId } });
    if (!connection) throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Provider not found');
    if (connection.type !== 'EMAIL') throw new ApiError(400, 'PROVIDER_SYNC_UNSUPPORTED', 'Only email providers can be synced here');
    if (connection.status === 'DISABLED') throw new ApiError(409, 'PROVIDER_DISABLED', 'Enable the provider before syncing');
    return connection;
};

const startRun = async (connectionId: string): Promise<SyncRun> => {
    const running = await prisma.syncRun.findFirst({ where: { providerConnectionId: connectionId, type: 'EMAIL_SYNC', status: 'RUNNING', startedAt: { gt: new Date(Date.now() - STALE_RUN_MS) } } });
    if (running) throw new ApiError(409, 'SYNC_ALREADY_RUNNING', 'This mailbox is already syncing; wait for the current run to finish');
    return prisma.syncRun.create({ data: { providerConnectionId: connectionId, type: 'EMAIL_SYNC' } });
};

// Every successful run carries the cursor forward, so the latest one is authoritative.
const lastCursor = async (connectionId: string): Promise<string | undefined> => {
    const run = await prisma.syncRun.findFirst({ where: { providerConnectionId: connectionId, type: 'EMAIL_SYNC', status: 'SUCCEEDED' }, orderBy: { startedAt: 'desc' } });
    const cursor = (run?.metadata as { cursor?: unknown } | null | undefined)?.cursor;
    return typeof cursor === 'string' ? cursor : undefined;
};

const finishRun = async (run: SyncRun, summary: EmailSyncSummary, cursor?: string) => {
    const now = new Date();
    const error = summary.failed ? `${summary.failed} message(s) could not be stored and will be retried` : null;
    await prisma.$transaction([
        prisma.syncRun.update({ where: { id: run.id }, data: {
            status: 'SUCCEEDED', finishedAt: now, createdCount: summary.created, skippedCount: summary.skipped,
            failedCount: summary.failed, errorSummary: error, metadata: cursor ? { cursor } : {},
        } }),
        prisma.providerConnection.update({ where: { id: run.providerConnectionId }, data: {
            status: 'CONNECTED', lastAttemptAt: now, lastSyncAt: now, lastSuccessAt: now, lastError: error,
        } }),
    ]);
};

const failRun = async (run: SyncRun, error: unknown) => {
    const now = new Date();
    const message = errorText(error);
    await prisma.$transaction([
        prisma.syncRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: now, errorSummary: message } }),
        prisma.providerConnection.update({ where: { id: run.providerConnectionId }, data: { status: 'ERROR', lastAttemptAt: now, lastFailureAt: now, lastError: message } }),
    ]);
};

// A mailbox already in ERROR is retried on every sweep; only the first failure is announced.
export const isNewSyncFailure = (previousStatus: ProviderConnection['status']) => previousStatus !== 'ERROR';

// Pulls new mail for one connection: provider → dedup/ingest → SyncRun + connection health.
export const syncEmailConnection = async (connectionId: string, deps: EmailSyncDeps = defaultDeps): Promise<EmailSyncSummary> => {
    const connection = await requireSyncableConnection(connectionId);
    const run = await startRun(connectionId);
    try {
        const previous = await lastCursor(connectionId);
        const page = await deps.fetchPage(connectionId, previous);
        const summary = await ingestPage(connectionId, page, deps.ingest);
        await finishRun(run, summary, cursorAfter(previous, page, summary));
        return summary;
    } catch (error) {
        await failRun(run, error);
        if (isNewSyncFailure(connection.status)) await notifyEmailSyncFailed(connectionId);
        if (error instanceof ApiError) throw error;
        throw new ApiError(502, 'EMAIL_SYNC_FAILED', `Mailbox sync failed: ${errorText(error)}`);
    }
};

export const syncAllEmailConnections = async (sync: (connectionId: string) => Promise<unknown> = syncEmailConnection) => {
    // DISCONNECTED connections were never verified; ERROR ones keep retrying so they can recover.
    const connections = await prisma.providerConnection.findMany({ where: { type: 'EMAIL', status: { in: ['CONNECTED', 'ERROR'] } }, select: { id: true, name: true } });
    await Promise.allSettled(connections.map(async connection => {
        try { await sync(connection.id); }
        catch (error) { logger.error(`[email-sync] "${connection.name}" (${connection.id}) failed: ${errorText(error)}`); }
    }));
    return connections.length;
};

let lastSweepAt = 0;
// Called from the worker tick, which runs far more often than mail needs to be polled.
export const syncEmailWhenDue = async (intervalMs = Number(process.env.EMAIL_SYNC_INTERVAL_MS ?? 300_000), now = Date.now()) => {
    if (process.env.EMAIL_SYNC_ENABLED === 'false' || now - lastSweepAt < intervalMs) return false;
    lastSweepAt = now;
    await syncAllEmailConnections();
    return true;
};
