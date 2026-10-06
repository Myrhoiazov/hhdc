import cron from 'node-cron';
import { logger } from '../../common/logger';
import { chunkKnowledgeDocument, type EmbeddingClient, type EmbeddedKnowledgeChunk } from './embedding.service';
import { normalizeKnowledgeDocument, type KnowledgeSource, type SourceDocumentRef } from './knowledge-ingestion.service';
import type { MysqlKnowledgeRepository } from './mysql-knowledge.repository';

type SyncStage = 'fetch' | 'html-fallback' | 'normalize' | 'embedding' | 'persist';
interface SyncFailure { sourceId: string; stage: SyncStage; code: string; }

export const indexKnowledgeSources = async (refs: SourceDocumentRef[], dependencies: {
    source: Pick<KnowledgeSource, 'fetch'>;
    fallback?: Pick<KnowledgeSource, 'fetch'>;
    embeddings: EmbeddingClient;
    repository: Pick<MysqlKnowledgeRepository, 'persistDocument'>;
    report?: (event: Record<string, unknown>) => void;
}) => {
    const result = { indexed: 0, chunks: 0, skipped: 0, failed: 0, failures: [] as SyncFailure[] };
    for (let index = 0; index < refs.length; index += 1) {
        const ref = refs[index];
        let stage: SyncStage = 'fetch';
        const report = (event: Record<string, unknown>) => dependencies.report?.({ sourceId: ref.sourceId, position: index + 1, total: refs.length, ...event });
        try {
            report({ status: 'started', stage });
            const raw = await dependencies.source.fetch(ref);
            stage = 'normalize';
            let document = normalizeKnowledgeDocument(raw);
            if (!document.content && dependencies.fallback) {
                stage = 'html-fallback';
                document = normalizeKnowledgeDocument(await dependencies.fallback.fetch(ref));
                document.title = raw.title;
            }
            const chunks = chunkKnowledgeDocument(document);
            if (!chunks.length) {
                result.skipped += 1;
                report({ status: 'skipped', reason: 'empty_content' });
                continue;
            }
            stage = 'embedding';
            report({ status: 'processing', stage, chunks: chunks.length });
            const embedded: EmbeddedKnowledgeChunk[] = [];
            for (const chunk of chunks) embedded.push({ ...chunk, embedding: await dependencies.embeddings.embed(chunk.content) });
            stage = 'persist';
            await dependencies.repository.persistDocument({ document, chunks: embedded });
            result.indexed += 1;
            result.chunks += chunks.length;
            report({ status: 'indexed', chunks: chunks.length });
        } catch (error) {
            const failure = error as { code?: unknown; cause?: { code?: unknown }; name?: unknown };
            const code = failure?.cause?.code ?? failure?.code ?? failure?.name ?? 'UNKNOWN';
            const detail: SyncFailure = { sourceId: ref.sourceId, stage, code: String(code) };
            result.failed += 1;
            result.failures.push(detail);
            report({ status: 'failed', ...detail });
        }
    }
    return result;
};

export const startKnowledgeSyncCron = (sync: () => Promise<void>): boolean => {
    if (process.env.KNOWLEDGE_SYNC_ENABLED !== 'true') return false;
    cron.schedule('0 3 * * 0', async () => {
        try { await sync(); } catch (error) {
            logger.error(`[KnowledgeSync] failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return true;
};
