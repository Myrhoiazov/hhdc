import path from 'node:path';
import { parseFrontMatter } from './front-matter';
import { inferPathMetadata } from './path-metadata';
import type { KnowledgeDocumentV2, KnowledgeMetadataV2 } from './kb-v2.types';

const asString = (value: unknown): string | undefined => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
    return undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 'false') return value === 'true';
    return undefined;
};

const asYear = (value: unknown): number | undefined => {
    const year = Number(asString(value));
    return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined;
};

const normalizeLanguage = (value: string | undefined) => (value?.toLowerCase() === 'ua' ? 'uk' : value?.toLowerCase());

const withoutUndefined = <T extends object>(value: T): Partial<T> => Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
) as Partial<T>;

// Front matter (snake_case YAML) → camelCase metadata; only fields actually present are returned,
// so the path-inferred defaults survive for everything the author did not declare.
const fromFrontMatter = (data: Record<string, unknown>): Partial<KnowledgeMetadataV2> => withoutUndefined({
    id: asString(data.id),
    version: typeof data.version === 'number' ? data.version : undefined,
    category: asString(data.category)?.toLowerCase() as KnowledgeMetadataV2['category'] | undefined,
    topic: asString(data.topic)?.toLowerCase(),
    subtopic: asString(data.subtopic)?.toLowerCase(),
    eventYear: asYear(data.event_year),
    status: asString(data.status)?.toLowerCase(),
    language: normalizeLanguage(asString(data.language)) as KnowledgeMetadataV2['language'] | undefined,
    priority: asString(data.priority)?.toLowerCase() as KnowledgeMetadataV2['priority'] | undefined,
    dynamic: asBoolean(data.dynamic),
    lastVerified: asString(data.last_verified),
    source: asString(data.source),
});

const extractTitle = (body: string, relativePath: string): string => {
    const heading = /^#\s+(.+?)\s*$/m.exec(body);
    return heading ? heading[1].replace(/\\/g, '').trim() : path.basename(relativePath, path.extname(relativePath));
};

// Lenient by design: always returns a document, even for broken front matter.
export const buildKnowledgeDocumentV2 = (relativePath: string, raw: string): KnowledgeDocumentV2 => {
    const frontMatter = parseFrontMatter(raw);
    const metadata = { ...inferPathMetadata(relativePath), ...fromFrontMatter(frontMatter.data) } as KnowledgeMetadataV2;
    return {
        metadata,
        title: extractTitle(frontMatter.body, relativePath),
        content: frontMatter.body.trim(),
        sourcePath: relativePath,
        hasFrontMatter: frontMatter.hasFrontMatter,
        frontMatterError: frontMatter.error,
    };
};
