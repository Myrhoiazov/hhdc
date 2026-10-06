import { KNOWN_FRONT_MATTER_KEYS } from './kb-document';
import { chunkKnowledgeDocumentV2 } from './markdown-chunker';
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_LANGUAGES, KNOWLEDGE_PRIORITIES, type KnowledgeDocumentV2 } from './kb-v2.types';

export type KbIssueSeverity = 'error' | 'warning';

export interface KbIssue {
    severity: KbIssueSeverity;
    sourcePath: string;
    code: string;
    message: string;
}

export interface KbValidationResult {
    ok: boolean;
    errors: KbIssue[];
    warnings: KbIssue[];
}

// Dynamic facts older than this are flagged (warning only) — schedule/prices should be re-checked
// against the website roughly once a quarter (see _meta/freshness-policy.md).
export const STALE_DYNAMIC_FACT_DAYS = 90;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DOCUMENT_ID = /^[a-z0-9][a-z0-9_]*$/;

type DocumentCheck = (document: KnowledgeDocumentV2, now: Date) => Array<Omit<KbIssue, 'sourcePath'>>;

const error = (code: string, message: string) => ({ severity: 'error' as const, code, message });
const warning = (code: string, message: string) => ({ severity: 'warning' as const, code, message });

const includesValue = (values: readonly string[], value: unknown) => typeof value === 'string' && values.includes(value);

const checkFrontMatter: DocumentCheck = (document) => {
    if (document.frontMatterError) return [error('invalid_yaml', `Invalid YAML front matter: ${document.frontMatterError}`)];
    const known = KNOWN_FRONT_MATTER_KEYS as readonly string[];
    return document.frontMatterKeys.filter((key) => !known.includes(key)).map((key) => warning('unknown_metadata_key', `Unknown front matter key "${key}"`));
};

const checkRequiredMetadata: DocumentCheck = (document) => {
    const { metadata } = document;
    const missing: string[] = (['id', 'category', 'priority', 'language'] as const).filter((field) => !metadata[field]);
    if (typeof metadata.dynamic !== 'boolean') missing.push('dynamic');
    return missing.length ? [error('missing_metadata', `Missing required metadata: ${missing.join(', ')}`)] : [];
};

const checkEnumerations: DocumentCheck = ({ metadata }) => [
    metadata.id && !DOCUMENT_ID.test(metadata.id) ? error('invalid_id', `id "${metadata.id}" must be snake_case`) : null,
    metadata.priority && !includesValue(KNOWLEDGE_PRIORITIES, metadata.priority) ? error('invalid_priority', `priority "${metadata.priority}" must be one of ${KNOWLEDGE_PRIORITIES.join('|')}`) : null,
    metadata.category && !includesValue(KNOWLEDGE_CATEGORIES, metadata.category) ? error('invalid_category', `category "${metadata.category}" is not supported`) : null,
    metadata.language && !includesValue(KNOWLEDGE_LANGUAGES, metadata.language) ? error('invalid_language', `language "${metadata.language}" must be one of ${KNOWLEDGE_LANGUAGES.join('|')}`) : null,
    metadata.priority === 'example' && metadata.language === 'canonical' ? warning('example_without_language', 'Response example has no language (use a -ru/-uk/-nl/-en file suffix or front matter)') : null,
].filter((issue): issue is NonNullable<typeof issue> => issue !== null);

// Declared `dynamic: true` without `last_verified` is an authoring error; a folder-inferred
// dynamic flag (no front matter yet) is only a warning so the existing KB can still be indexed.
const checkFreshness: DocumentCheck = ({ metadata, frontMatterKeys }, now) => {
    if (metadata.lastVerified && !ISO_DATE.test(metadata.lastVerified)) return [error('invalid_last_verified', `last_verified "${metadata.lastVerified}" must be YYYY-MM-DD`)];
    if (!metadata.dynamic) return [];
    if (!metadata.lastVerified) {
        const declared = frontMatterKeys.includes('dynamic');
        return [(declared ? error : warning)('dynamic_without_last_verified', 'Dynamic document has no last_verified date')];
    }
    const ageDays = (now.getTime() - Date.parse(`${metadata.lastVerified}T00:00:00Z`)) / 86_400_000;
    return ageDays > STALE_DYNAMIC_FACT_DAYS ? [warning('stale_dynamic_fact', `last_verified ${metadata.lastVerified} is older than ${STALE_DYNAMIC_FACT_DAYS} days`)] : [];
};

const checkContent: DocumentCheck = (document) => (
    chunkKnowledgeDocumentV2(document).length ? [] : [error('empty_content', 'Document has no indexable content')]
);

const DOCUMENT_CHECKS: DocumentCheck[] = [checkFrontMatter, checkRequiredMetadata, checkEnumerations, checkFreshness, checkContent];

const findDuplicateIds = (documents: KnowledgeDocumentV2[]): KbIssue[] => {
    const pathsById = new Map<string, string[]>();
    documents.forEach((document) => pathsById.set(document.metadata.id, [...(pathsById.get(document.metadata.id) ?? []), document.sourcePath]));
    return Array.from(pathsById.entries())
        .filter(([id, paths]) => id && paths.length > 1)
        .flatMap(([id, paths]) => paths.map((sourcePath) => ({ severity: 'error' as const, sourcePath, code: 'duplicate_id', message: `id "${id}" is also used by ${paths.filter((other) => other !== sourcePath).join(', ')}` })));
};

export const validateKnowledgeBaseV2 = (documents: KnowledgeDocumentV2[], now = new Date()): KbValidationResult => {
    const perDocument = documents.flatMap((document) => DOCUMENT_CHECKS.flatMap((check) => check(document, now).map((issue) => ({ ...issue, sourcePath: document.sourcePath }))));
    const issues = [...perDocument, ...findDuplicateIds(documents)];
    const errors = issues.filter((issue) => issue.severity === 'error');
    return { ok: errors.length === 0, errors, warnings: issues.filter((issue) => issue.severity === 'warning') };
};
