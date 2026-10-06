import { aiConfig, type AiConfig } from '../../../config/ai.config';
import { createPrismaKbV2Store, OllamaEmbeddingClient } from '../../knowledge-ingestion';
import { promptCharacterBudget } from './context-builder';
import { retrieveLayeredKnowledge } from './layered-retriever';
import type { RagV2DraftDeps } from './rag-v2-draft.service';

// Production wiring for RAG v2 (local Ollama embeddings + the kb_version='v2' MySQL namespace);
// shared by the draft cron and the "Симуляция письма" admin panel.
export const createRagV2Deps = (config: AiConfig = aiConfig): Omit<RagV2DraftDeps, 'draftClient'> => {
    const embeddings = new OllamaEmbeddingClient();
    const store = createPrismaKbV2Store();
    return {
        retrieve: (query, plan) => retrieveLayeredKnowledge(query, plan, { embeddings, store }),
        limits: { rules: config.ragRuleLimit, facts: config.ragFactLimit, faq: config.ragFaqLimit, examples: config.ragExampleLimit },
        characterBudget: promptCharacterBudget(config.contextLength),
    };
};
