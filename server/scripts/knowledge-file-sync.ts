import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import {
    chunkKnowledgeDocument,
    importKnowledgeFile,
    MysqlKnowledgeRepository,
    OllamaEmbeddingClient,
    type EmbeddedKnowledgeChunk,
} from '../src/modules/knowledge-ingestion';

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: npm run knowledge:file -- /app/knowledge/example.md');
    process.exit(1);
}

const collectFiles = async (target: string): Promise<string[]> => {
    const entries = await readdir(target, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
        const child = path.join(target, entry.name);
        return entry.isDirectory() ? collectFiles(child) : [child];
    }));
    return nested.flat().filter((value) => /\.(md|txt|html?|pdf|docx)$/i.test(value));
};

const main = async () => {
    const target = path.resolve(filePath);
    const targetStat = await stat(target);
    const files = targetStat.isDirectory() ? await collectFiles(target) : [target];
    const root = files.length > 1 ? target : path.dirname(target);
    let indexed = 0;
    for (const currentFile of files) {
        const result = await importKnowledgeFile(currentFile, { sourceId: path.relative(root, currentFile) });
        if (result.status !== 'ready' || !result.document) {
            console.error(JSON.stringify({ status: result.status, reason: result.reason, fileName: result.fileName }));
            continue;
        }
        const embedder = new OllamaEmbeddingClient();
        const chunks: EmbeddedKnowledgeChunk[] = [];
        for (const chunk of chunkKnowledgeDocument(result.document)) chunks.push({ ...chunk, embedding: await embedder.embed(chunk.content) });
        await new MysqlKnowledgeRepository().persistDocument({ document: result.document, chunks, embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL });
        indexed += 1;
        console.log(JSON.stringify({ status: 'indexed', fileName: result.fileName, relativePath: result.document.relativePath, folderPath: result.document.folderPath, chunks: chunks.length }));
    }
    console.log(JSON.stringify({ status: 'complete', files: files.length, indexed }));
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
