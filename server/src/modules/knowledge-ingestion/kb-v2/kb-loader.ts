import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { buildKnowledgeDocumentV2 } from './kb-document';
import type { KnowledgeDocumentV2 } from './kb-v2.types';

// Paths under the knowledge root that are never indexed:
// - `_meta/`, the root README and the implementation spec are instructions for developers, not
//   knowledge for the drafting model;
// - `07_faq/`, `09_business_rules/`, `10_sources/` are v1 leftovers superseded by `08_faq/`,
//   `10_business_rules/`, `13_sources/` (indexing both would duplicate/contradict rules);
// - `_`-prefixed files (e.g. `11_response_examples/_bad-examples.md`) are anti-patterns kept
//   for humans — quoting a bad example to a small model invites it to copy it.
const IGNORED_PREFIXES = ['_meta/', '07_faq/', '09_business_rules/', '10_sources/'];
const IGNORED_FILES = new Set(['README.md', 'RAG_V2_IMPLEMENTATION_SPEC.md']);

export const isIgnoredKnowledgePath = (relativePath: string): boolean => IGNORED_FILES.has(relativePath)
    || IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
    || path.posix.basename(relativePath).startsWith('_')
    || !relativePath.toLowerCase().endsWith('.md');

const walkMarkdownFiles = async (root: string, current = root): Promise<string[]> => {
    const entries = await readdir(current, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
        const child = path.join(current, entry.name);
        return entry.isDirectory() ? walkMarkdownFiles(root, child) : [path.relative(root, child).split(path.sep).join('/')];
    }));
    return nested.flat();
};

export interface LoadedKnowledgeBase {
    root: string;
    documents: KnowledgeDocumentV2[];
    ignored: string[];
}

export const loadKnowledgeBaseV2 = async (root: string): Promise<LoadedKnowledgeBase> => {
    const absoluteRoot = path.resolve(root);
    const files = (await walkMarkdownFiles(absoluteRoot)).sort();
    const included = files.filter((file) => !isIgnoredKnowledgePath(file));
    const documents = await Promise.all(included.map(async (file) => buildKnowledgeDocumentV2(file, await readFile(path.join(absoluteRoot, file), 'utf8'))));
    return { root: absoluteRoot, documents, ignored: files.filter((file) => isIgnoredKnowledgePath(file)) };
};
