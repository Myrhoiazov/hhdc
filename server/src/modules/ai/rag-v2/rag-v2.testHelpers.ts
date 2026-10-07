import path from 'node:path';
import { chunkKnowledgeDocumentV2, loadKnowledgeBaseV2, normalizeAliasText, type EmbeddingClient, type KbV2Store, type StoredChunkV2 } from '../../knowledge/kb-v2';
import type { EmailClassification } from '../email-classification';

// Deterministic stand-ins for the embedding model and the database: a small committed knowledge
// base in the HHDC structure, embedded with a hashed bag-of-word-prefixes vector. The signal is
// deliberately weak, so a passing test shows that metadata filtering — not embedding luck — keeps
// event years and topics apart.
export const FIXTURE_KB_ROOT = path.join(__dirname, '__fixtures__', 'hhdc-kb');
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
        normalizeAliasText(text).split(' ').filter(token => token.length > 2).forEach(token => { vector[hashToken(token.slice(0, PREFIX_LENGTH))] += 1; });
        return vector;
    },
};

let cachedChunks: Promise<StoredChunkV2[]> | null = null;

const buildChunks = async (): Promise<StoredChunkV2[]> => {
    const files = await loadKnowledgeBaseV2([FIXTURE_KB_ROOT]);
    const chunks = files.flatMap(file => chunkKnowledgeDocumentV2(file.document));
    return Promise.all(chunks.map(async chunk => ({ id: `kb_v2:${chunk.chunkId}`, content: chunk.content, embedding: await fakeEmbeddings.embed(chunk.content), metadata: chunk.metadata })));
};

export const createKnowledgeStore = (): KbV2Store => ({
    listActiveChunks: async () => {
        cachedChunks = cachedChunks ?? buildChunks();
        return cachedChunks;
    },
});

export const DEFAULT_TEST_LIMITS = { rules: 3, facts: 4, faq: 2, examples: 2 };
export const CURRENT_EVENT_YEAR = 2027;
export const FIXED_NOW = () => new Date('2026-10-08T00:00:00Z');

export const classified = (intent: EmailClassification['intent'], overrides: Partial<EmailClassification> = {}): EmailClassification => ({
    spam: false, needsReply: true, replyLanguage: 'en', intent, secondaryIntents: [], needsCRM: false, needsKnowledge: true,
    needsHumanAction: false, urgency: 'normal', confidence: 0.9, ...overrides,
});
