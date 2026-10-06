import { createHash } from 'node:crypto';
import path from 'node:path';
import { CITY_ALIASES, STYLE_ALIASES, normalizeEntityValue } from './entity-aliases';
import { parseFrontMatter } from './front-matter';
import { inferPathMetadata } from './path-metadata';
import type { KnowledgeDocumentV2, KnowledgeMetadataV2 } from './kb-v2.types';

export const KNOWN_FRONT_MATTER_KEYS = [
    'id', 'version', 'category', 'topic', 'subtopic', 'city', 'style', 'age_group', 'language',
    'priority', 'dynamic', 'last_verified', 'source',
] as const;

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

const normalizeLanguage = (value: string | undefined) => (value?.toLowerCase() === 'ua' ? 'uk' : value?.toLowerCase());

const withoutUndefined = <T extends object>(value: T): Partial<T> => Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
) as Partial<T>;

const REQUIRED_KEYS = ['id', 'category', 'priority', 'language', 'dynamic'] as const;

// A required key the author declared but left empty/unparseable must surface as missing in the
// validator — not be silently replaced by the path-inferred default.
const keepDeclaredInvalid = (data: Record<string, unknown>, parsed: Partial<KnowledgeMetadataV2>): Partial<KnowledgeMetadataV2> => {
    const invalid = REQUIRED_KEYS.filter((key) => key in data && parsed[key] === undefined);
    return { ...parsed, ...Object.fromEntries(invalid.map((key): [string, undefined] => [key, undefined])) };
};

// Front matter (snake_case YAML) → camelCase metadata; only fields actually present are returned
// so the path-inferred defaults survive for everything the author didn't declare.
const fromFrontMatter = (data: Record<string, unknown>): Partial<KnowledgeMetadataV2> => keepDeclaredInvalid(data, parseFrontMatterFields(data));

const parseFrontMatterFields = (data: Record<string, unknown>): Partial<KnowledgeMetadataV2> => {
    const city = asString(data.city);
    const style = asString(data.style);
    return withoutUndefined({
        id: asString(data.id),
        version: typeof data.version === 'number' ? data.version : undefined,
        category: asString(data.category)?.toLowerCase() as KnowledgeMetadataV2['category'] | undefined,
        topic: asString(data.topic),
        subtopic: asString(data.subtopic),
        city: city ? normalizeEntityValue(city, CITY_ALIASES) : undefined,
        style: style ? normalizeEntityValue(style, STYLE_ALIASES) : undefined,
        ageGroup: asString(data.age_group),
        language: normalizeLanguage(asString(data.language)) as KnowledgeMetadataV2['language'] | undefined,
        priority: asString(data.priority)?.toLowerCase() as KnowledgeMetadataV2['priority'] | undefined,
        dynamic: asBoolean(data.dynamic),
        lastVerified: asString(data.last_verified),
        source: asString(data.source),
    });
};

const extractTitle = (body: string, relativePath: string): string => {
    const heading = /^#\s+(.+?)\s*$/m.exec(body);
    return heading ? heading[1].replace(/\\/g, '').replace(/\s*---\s*/g, ' — ').trim() : path.basename(relativePath, path.extname(relativePath));
};

const extractSourceUrl = (body: string): string | undefined => {
    const section = /^##\s+Sources?\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(body);
    return section ? /https?:\/\/\S+/.exec(section[1])?.[0] : undefined;
};

// Lenient by design: always returns a document, even for broken metadata — kb-validator.ts is
// what decides whether the collection is fit to index.
export const buildKnowledgeDocumentV2 = (relativePath: string, raw: string): KnowledgeDocumentV2 => {
    const frontMatter = parseFrontMatter(raw);
    const metadata = { ...inferPathMetadata(relativePath), ...fromFrontMatter(frontMatter.data) } as KnowledgeMetadataV2;
    return {
        metadata,
        title: extractTitle(frontMatter.body, relativePath),
        content: frontMatter.body.trim(),
        sourcePath: relativePath,
        sourceUrl: extractSourceUrl(frontMatter.body),
        contentHash: createHash('sha256').update(raw).digest('hex'),
        hasFrontMatter: frontMatter.hasFrontMatter,
        frontMatterKeys: Object.keys(frontMatter.data),
        frontMatterError: frontMatter.error,
    };
};
