import cron from 'node-cron';
import { logger } from '../../common/logger';
import { aiConfig } from '../../config/ai.config';
import { createDraftProviderFactory } from './draft-provider.factory';
import { OllamaLlmClient } from './ollama.client';
import { createPrismaCrmReader } from './crm-context.service';
import { createPrismaDraftPipelineRepository, runDraftPipeline, type RunDraftPipelineOptions } from './draft-pipeline.service';
import { createRagV2Deps } from './rag-v2/rag-v2.factory';
import {
    KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient,
    OllamaQueryExpansionClient, OllamaReranker,
} from '../knowledge-ingestion';

// Query expansion / reranking each add an extra model call to every classify→retrieve→draft
// cycle — off by default (aiConfig.ragQueryExpansionEnabled/ragRerankEnabled) on this deployment's
// 2 CPU/4 GB VPS until an admin opts in via .env after evaluating the effect in the "Симуляция
// письма" panel, where both are always available regardless of this flag.
const buildRetrievalService = (): KnowledgeRetrievalService => {
    const embeddings = new OllamaEmbeddingClient();
    return new KnowledgeRetrievalService(embeddings, new MysqlKnowledgeRepository(), {
        queryExpansion: aiConfig.ragQueryExpansionEnabled ? new OllamaQueryExpansionClient() : undefined,
        reranker: aiConfig.ragRerankEnabled ? new OllamaReranker(embeddings) : undefined,
    });
};

// RAG_VERSION picks the knowledge path per run: v2 = layered rules/facts/FAQ/examples over the
// kb_version='v2' namespace; anything else = the original flat v1 retrieval. Switching back is
// a pure env change — both namespaces stay indexed.
export const buildKnowledgeOptions = (ragVersion = aiConfig.ragVersion): Pick<RunDraftPipelineOptions, 'knowledgeProvider' | 'ragV2'> => (
    ragVersion === 'v2' ? { ragV2: createRagV2Deps() } : { knowledgeProvider: buildRetrievalService() }
);

export const startAiEmailDraftCron = (): boolean => {
    if (process.env.AI_EMAIL_DRAFT_ENABLED !== 'true') return false;
    cron.schedule('*/5 * * * *', async () => {
        try {
            const result = await runDraftPipeline(
                createPrismaDraftPipelineRepository(),
                createPrismaCrmReader(),
                await createDraftProviderFactory().getSelectedProvider().catch(() => new OllamaLlmClient()),
                buildKnowledgeOptions(),
            );
            logger.info(`[AiEmailDraft] processed=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`);
        } catch (error) {
            logger.error(`[AiEmailDraft] batch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return true;
};
