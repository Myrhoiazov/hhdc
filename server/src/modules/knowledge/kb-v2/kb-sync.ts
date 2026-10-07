import path from 'node:path';
import prisma from '../../../../prisma/prisma-client';
import { contentHash, recordKnowledgeVersion, reindexDocument, replaceTextChunks } from '../service';
import { KB_V2_SOURCE_TYPE, kbV2SourceUrl } from './kb-chunks';
import { loadKnowledgeBaseV2 } from './kb-loader';

export interface KbFile { relativePath: string; title: string; raw: string }
export interface KbStoredDocument { id: string; sourceUrl: string | null; content: string; embedded: boolean }
export type KbSyncAction = 'create' | 'embed' | 'keep' | 'overwrite' | 'skip-edited';

export interface KbSyncSummary { created: number; updated: number; embedded: number; unchanged: number; editedInCrm: number; failed: string[] }

// The CRM is where knowledge is edited, so a file never silently replaces an edited document:
// that only happens when the sync is asked to overwrite.
export const planKbFile = (file: KbFile, stored: KbStoredDocument | undefined, overwrite: boolean): KbSyncAction => {
    if (!stored) return 'create';
    if (contentHash(stored.content) === contentHash(file.raw)) return stored.embedded ? 'keep' : 'embed';
    return overwrite ? 'overwrite' : 'skip-edited';
};

const DEFAULT_ROOTS = 'knowledge/hhdc-knowledge-v1,knowledge/hhdc-knowledge-v2';

// RAG_KNOWLEDGE_PATH lists the knowledge-base folders, comma separated.
export const knowledgeRoots = (env: NodeJS.ProcessEnv = process.env): string[] => (env.RAG_KNOWLEDGE_PATH || DEFAULT_ROOTS)
    .split(',').map(root => root.trim()).filter(Boolean).map(root => path.resolve(process.cwd(), root));

const loadFiles = async (roots: string[]): Promise<KbFile[]> => (await loadKnowledgeBaseV2(roots))
    .map(({ document, raw }) => ({ relativePath: document.sourcePath, title: document.title, raw }));

const loadStored = async (): Promise<Map<string, KbStoredDocument>> => {
    const rows = await prisma.$queryRaw<KbStoredDocument[]>`
        SELECT d.id, d."sourceUrl", d.content,
            (EXISTS (SELECT 1 FROM "KnowledgeChunk" c WHERE c."documentId" = d.id)
                AND NOT EXISTS (SELECT 1 FROM "KnowledgeChunk" c WHERE c."documentId" = d.id AND c.embedding IS NULL)) AS embedded
        FROM "KnowledgeDocument" d WHERE d."sourceType" = ${KB_V2_SOURCE_TYPE}`;
    return new Map(rows.map(row => [row.sourceUrl ?? '', row]));
};

const saveFile = async (file: KbFile, existingId?: string): Promise<string> => prisma.$transaction(async tx => {
    const data = { title: file.title.slice(0, 300), content: file.raw, status: 'ACTIVE' as const };
    const document = existingId
        ? await tx.knowledgeDocument.update({ where: { id: existingId }, data })
        : await tx.knowledgeDocument.create({ data: { ...data, scope: 'GLOBAL', visibility: 'INTERNAL', sourceType: KB_V2_SOURCE_TYPE, sourceUrl: kbV2SourceUrl(file.relativePath) } });
    await recordKnowledgeVersion(tx, document.id, document.content);
    await replaceTextChunks(tx, document);
    return document.id;
});

const COUNTERS: Record<KbSyncAction, keyof Omit<KbSyncSummary, 'failed'> | null> = {
    create: 'created', overwrite: 'updated', embed: null, keep: 'unchanged', 'skip-edited': 'editedInCrm',
};

const applyFile = async (file: KbFile, stored: KbStoredDocument | undefined, overwrite: boolean, summary: KbSyncSummary) => {
    const action = planKbFile(file, stored, overwrite);
    const counter = COUNTERS[action];
    if (counter) summary[counter] += 1;
    if (action === 'keep' || action === 'skip-edited') return;
    const id = action === 'embed' && stored ? stored.id : await saveFile(file, stored?.id);
    await reindexDocument(id);
    summary.embedded += 1;
};

// Brings the bundled knowledge files into the CRM knowledge base and embeds them for RAG v2.
// One failing document (for example the embedding model being down) does not stop the others.
export const syncKnowledgeBaseV2 = async (options: { overwrite: boolean; actorUserId: string }): Promise<KbSyncSummary> => {
    const files = await loadFiles(knowledgeRoots());
    const stored = await loadStored();
    const summary: KbSyncSummary = { created: 0, updated: 0, embedded: 0, unchanged: 0, editedInCrm: 0, failed: [] };
    for (const file of files) {
        try { await applyFile(file, stored.get(kbV2SourceUrl(file.relativePath)), options.overwrite, summary); }
        catch { summary.failed.push(file.relativePath); }
    }
    await prisma.auditLog.create({ data: { actorUserId: options.actorUserId, action: 'KNOWLEDGE_V2_SYNCED', entityType: 'KnowledgeDocument' } });
    return summary;
};
