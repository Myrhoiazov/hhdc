import path from 'node:path';
import { chunkKnowledgeDocumentV2, loadKnowledgeBaseV2, normalizeAliasText, type EmbeddingClient, type KbV2Store, type StoredChunkV2 } from '../../knowledge-ingestion';

// Deterministic stand-ins for Ollama + MySQL so retrieval/regression tests run in CI: the
// committed fixture knowledge base, embedded with a hashed bag-of-word-prefixes vector. It is a
// deliberately weak "semantic" signal — tests passing on it show that metadata filtering, not
// embedding luck, is what keeps Rotterdam/Amsterdam (etc.) apart.

export const FIXTURE_KB_ROOT = path.join(__dirname, '..', '..', 'knowledge-ingestion', 'kb-v2', '__fixtures__', 'kb');
const DIMENSIONS = 512;
const PREFIX_LENGTH = 5;

const hashToken = (token: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) hash = Math.imul(hash ^ token.charCodeAt(index), 16777619);
    return Math.abs(hash) % DIMENSIONS;
};

export const fakeEmbeddings: EmbeddingClient = {
    embed: async (text: string) => {
        const vector = new Array<number>(DIMENSIONS).fill(0);
        normalizeAliasText(text).split(' ').filter((token) => token.length > 2).forEach((token) => { vector[hashToken(token.slice(0, PREFIX_LENGTH))] += 1; });
        return vector;
    },
};

let cachedChunks: Promise<StoredChunkV2[]> | null = null;

const buildFixtureChunks = async (): Promise<StoredChunkV2[]> => {
    const { documents } = await loadKnowledgeBaseV2(FIXTURE_KB_ROOT);
    const chunks = documents.flatMap((document) => chunkKnowledgeDocumentV2(document));
    return Promise.all(chunks.map(async (chunk) => ({ id: `kb_v2:${chunk.chunkId}`, content: chunk.content, embedding: await fakeEmbeddings.embed(chunk.content), metadata: chunk.metadata })));
};

export const createFixtureStore = (extra: StoredChunkV2[] = []): Pick<KbV2Store, 'listActiveChunks'> => ({
    listActiveChunks: async () => {
        cachedChunks = cachedChunks ?? buildFixtureChunks();
        return [...(await cachedChunks), ...extra];
    },
});

export const DEFAULT_TEST_LIMITS = { rules: 3, facts: 4, faq: 2, examples: 2 };

export const FIXED_NOW = () => new Date('2026-10-01T00:00:00Z');
