import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { buildKnowledgeDocumentV2 } from './kb-document';
import type { KnowledgeDocumentV2 } from './kb-v2.types';

// Never indexed: notes written for developers and evaluators rather than for the drafting model
// (retrieval guides, the intent router, rubrics, test datasets, source registries), the READMEs,
// and `_`-prefixed files such as the bad-example collection — quoting a bad example to a model
// invites it to copy it.
const IGNORED_FOLDERS = ['_meta', '12_sources', '14_intent_router', '15_evaluation', '16_test_dataset'];

export const isIgnoredKnowledgePath = (relativePath: string): boolean => {
    const segments = relativePath.split('/');
    const file = segments[segments.length - 1];
    return !file.toLowerCase().endsWith('.md') || file === 'README.md' || file.startsWith('_')
        || segments.slice(0, -1).some(segment => IGNORED_FOLDERS.includes(segment));
};

const walkFiles = async (root: string, current = root): Promise<string[]> => {
    const entries = await readdir(current, { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => {
        const child = path.join(current, entry.name);
        return entry.isDirectory() ? walkFiles(root, child) : [path.relative(root, child).split(path.sep).join('/')];
    }));
    return nested.flat();
};

export interface LoadedKnowledgeFile { document: KnowledgeDocumentV2; raw: string }

// Paths are prefixed with the folder name, so the same file name in two knowledge bases
// ("12_sources/…" in v1 and v2) stays distinct.
const loadRoot = async (root: string): Promise<LoadedKnowledgeFile[]> => {
    const absoluteRoot = path.resolve(root);
    const prefix = path.basename(absoluteRoot);
    const files = (await walkFiles(absoluteRoot)).sort().filter(file => !isIgnoredKnowledgePath(file));
    return Promise.all(files.map(async file => {
        const raw = await readFile(path.join(absoluteRoot, file), 'utf8');
        return { raw, document: buildKnowledgeDocumentV2(`${prefix}/${file}`, raw) };
    }));
};

export const loadKnowledgeBaseV2 = async (roots: string[]): Promise<LoadedKnowledgeFile[]> => (await Promise.all(roots.map(loadRoot))).flat();
