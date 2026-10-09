import prisma from '../../../prisma/prisma-client';

const RUNS_SHOWN = 20;

// The latest runs of a connection: what each one read and why it failed, newest first.
export const listSyncRuns = (connectionId: string) => prisma.syncRun.findMany({
    where: { providerConnectionId: connectionId }, orderBy: { startedAt: 'desc' }, take: RUNS_SHOWN,
    select: { id: true, type: true, status: true, startedAt: true, finishedAt: true, createdCount: true, updatedCount: true, skippedCount: true, failedCount: true, errorSummary: true, metadata: true },
});
