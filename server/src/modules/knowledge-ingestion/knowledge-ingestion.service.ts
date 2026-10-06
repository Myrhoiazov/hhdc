import { createHash } from 'node:crypto';

export type KnowledgeSourceType = 'wordpress' | 'website' | 'file' | 'manual';

export interface SourceDocumentRef {
    sourceType: KnowledgeSourceType;
    sourceId: string;
    sourceUrl: string;
    language?: string;
}

export interface SourceDocument {
    ref: SourceDocumentRef;
    title: string;
    html: string;
    modifiedAt?: Date;
}

export interface KnowledgeSource {
    discover(): Promise<SourceDocumentRef[]>;
    fetch(ref: SourceDocumentRef): Promise<SourceDocument>;
}

export interface KnowledgePolicy {
    allowedDomains: string[];
    includePatterns?: RegExp[];
    excludePatterns?: RegExp[];
    // The language considered canonical for this site (spec default: 'nl'). Pages whose URL
    // carries a recognized language-prefix segment (/nl/, /en/, /uk/, /ru/) other than this one
    // are translations of already-canonical content and are excluded from indexing rather than
    // duplicating the knowledge base per-language (see docs/spec section 10.1).
    canonicalLanguage?: string;
}

export interface NormalizedKnowledgeDocument {
    sourceType: KnowledgeSourceType;
    sourceId: string;
    sourceUrl: string;
    title: string;
    language: string;
    content: string;
    contentHash: string;
    sourceModifiedAt?: Date;
    lastCheckedAt: Date;
    active: boolean;
    relativePath?: string;
    folderPath?: string;
}

// Maps a URL path's language-prefix segment to the language codes used across the AI email
// assistant (see emailClassificationSchema/emailDraftSchema: 'nl' | 'en' | 'ua' | 'ru'). The site's
// URL segment for Ukrainian is "uk" (ISO 639-1), which we normalize to our internal "ua" code.
const URL_LANGUAGE_SEGMENT_MAP: Record<string, string> = { nl: 'nl', en: 'en', uk: 'ua', ru: 'ru' };

export const detectKnowledgeLanguage = (pathname: string, canonicalLanguage: string): string => {
    const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
    return (firstSegment && URL_LANGUAGE_SEGMENT_MAP[firstSegment]) || canonicalLanguage;
};

export const isAllowedKnowledgeUrl = (value: string, policy: KnowledgePolicy): boolean => {
    let url: URL;
    try { url = new URL(value); } catch { return false; }
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const allowed = policy.allowedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    if (!allowed) return false;
    if (/\/(wp-admin|wp-login|login|search|checkout|cart|my-account|shop|category|tag)(\/|$)/i.test(url.pathname)) return false;
    const canonicalLanguage = policy.canonicalLanguage ?? 'nl';
    if (detectKnowledgeLanguage(url.pathname, canonicalLanguage) !== canonicalLanguage) return false;
    if (policy.excludePatterns?.some((pattern) => pattern.test(url.href))) return false;
    return !policy.includePatterns?.length || policy.includePatterns.some((pattern) => pattern.test(url.href));
};

const decodeEntities = (value: string) => value
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");

export const normalizeKnowledgeHtml = (html: string): string => decodeEntities(html
    .replace(/<(script|style|nav|footer|header|form|aside)[^>]*>[\s\S]*?<\/\1>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n').replace(/<\/h[1-6]>/gi, '\n\n')
    // Tag-name boundaries below are anchored with a lookahead ([\s>/]) — otherwise "li" also
    // matches "link" and "p" also matches "path"/"picture"/"pre", turning every <link> tag in a
    // page's <head> (favicons, canonical, hreflang alternates — commonly 15-30 per WordPress
    // page) into a content-free "- " bullet that silently bloats every document.
    .replace(/<li(?=[\s>/])[^>]*>/gi, '\n- ').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p(?=[\s>/])[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export const normalizeKnowledgeDocument = (document: SourceDocument, now = new Date()): NormalizedKnowledgeDocument => {
    const content = normalizeKnowledgeHtml(document.html);
    return {
        sourceType: document.ref.sourceType,
        sourceId: document.ref.sourceId,
        sourceUrl: document.ref.sourceUrl,
        title: document.title.trim().slice(0, 500),
        language: document.ref.language ?? 'nl',
        content,
        contentHash: createHash('sha256').update(content).digest('hex'),
        sourceModifiedAt: document.modifiedAt,
        lastCheckedAt: now,
        active: content.length > 0,
        relativePath: document.ref.sourceId,
        folderPath: document.ref.sourceId.includes('/') ? document.ref.sourceId.slice(0, document.ref.sourceId.lastIndexOf('/')) : undefined,
    };
};

export interface SyncPreview { discovered: number; eligible: number; excluded: number; }

export interface IncrementalSyncState { sourceId: string; contentHash: string; active: boolean; }
export interface IncrementalSyncPlan { newSourceIds: string[]; changedSourceIds: string[]; unchangedSourceIds: string[]; removedSourceIds: string[]; }

export const buildSyncPreview = (refs: SourceDocumentRef[], policy: KnowledgePolicy): SyncPreview => {
    const eligible = refs.filter((ref) => isAllowedKnowledgeUrl(ref.sourceUrl, policy)).length;
    return { discovered: refs.length, eligible, excluded: refs.length - eligible };
};

export const planIncrementalSync = (
    current: Array<{ sourceId: string; contentHash: string }>,
    previous: IncrementalSyncState[],
): IncrementalSyncPlan => {
    const oldById = new Map(previous.map((item) => [item.sourceId, item]));
    const currentIds = new Set(current.map((item) => item.sourceId));
    const plan: IncrementalSyncPlan = { newSourceIds: [], changedSourceIds: [], unchangedSourceIds: [], removedSourceIds: [] };
    current.forEach((item) => {
        const old = oldById.get(item.sourceId);
        if (!old) plan.newSourceIds.push(item.sourceId);
        else if (old.contentHash !== item.contentHash) plan.changedSourceIds.push(item.sourceId);
        else plan.unchangedSourceIds.push(item.sourceId);
    });
    previous.forEach((item) => {
        if (!currentIds.has(item.sourceId) && item.active) plan.removedSourceIds.push(item.sourceId);
    });
    return plan;
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchWithRetry = async (fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<Response> => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetchImpl(url, init);
            if (response.ok || (response.status < 500 && response.status !== 429) || attempt === maxAttempts) return response;
        } catch (error) {
            if (attempt === maxAttempts) throw error;
        }
        await sleep(250 * (2 ** (attempt - 1)));
    }
    throw new Error('Knowledge source request failed after retries');
};

const requestJson = async (fetchImpl: typeof fetch, url: string): Promise<any> => {
    const response = await fetchWithRetry(fetchImpl, url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Knowledge source request failed with HTTP ${response.status}`);
    return response.json();
};

export class WordPressKnowledgeSource implements KnowledgeSource {
    public constructor(private readonly baseUrl: string, private readonly policy: KnowledgePolicy, private readonly fetchImpl: typeof fetch = fetch) {}

    public async discover(): Promise<SourceDocumentRef[]> {
        const base = this.baseUrl.replace(/\/$/, '');
        const canonicalLanguage = this.policy.canonicalLanguage ?? 'nl';
        const refs: SourceDocumentRef[] = [];
        for (const type of ['pages', 'posts']) {
            const items = await requestJson(this.fetchImpl, `${base}/wp-json/wp/v2/${type}?per_page=100&_fields=id,link,lang`);
            refs.push(...items.map((item: { id: number; link: string; lang?: string }) => ({
                sourceType: 'wordpress' as const,
                sourceId: `${type}:${item.id}`,
                sourceUrl: item.link,
                // A multilingual plugin's REST field (item.lang) wins when present; otherwise the
                // URL path prefix is the reliable signal (most WordPress REST APIs, including this
                // site's, do not expose a language field at all).
                language: item.lang ?? detectKnowledgeLanguage(new URL(item.link).pathname, canonicalLanguage),
            })));
        }
        return refs.filter((ref) => isAllowedKnowledgeUrl(ref.sourceUrl, this.policy));
    }

    public async fetch(ref: SourceDocumentRef): Promise<SourceDocument> {
        const [type, id] = ref.sourceId.split(':');
        const item = await requestJson(this.fetchImpl, `${this.baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/${type}/${id}`);
        return { ref, title: String(item.title?.rendered ?? ''), html: String(item.content?.rendered ?? ''), modifiedAt: item.modified ? new Date(item.modified) : undefined };
    }
}

// Extracts <loc> values from a sitemap, whether the URL is plain text or CDATA-wrapped
// (<loc><![CDATA[https://example.com/]]></loc>) — SEO plugins such as All in One SEO wrap every
// <loc> in CDATA, which a plain "no '<' characters" pattern cannot match at all.
const extractSitemapLocations = (xml: string): string[] => Array.from(
    xml.matchAll(/<loc>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))\s*<\/loc>/gi),
    (match) => (match[1] ?? match[2] ?? '').trim(),
).filter(Boolean);

const MAX_SITEMAP_RECURSION_DEPTH = 2;

export class SitemapKnowledgeSource implements KnowledgeSource {
    public constructor(private readonly sitemapUrl: string, private readonly policy: KnowledgePolicy, private readonly fetchImpl: typeof fetch = fetch) {}

    // A sitemap URL may itself be a <sitemapindex> pointing at per-post-type sitemaps (posts,
    // pages, and — critically for this site — custom post types like "styles" and
    // "choreographer" that have no WordPress REST route at all and are otherwise undiscoverable).
    // Recurse into those, bounded to avoid unbounded/cyclic fetching of a misbehaving sitemap.
    private async collectLocations(url: string, depth: number): Promise<string[]> {
        const response = await fetchWithRetry(this.fetchImpl, url);
        if (!response.ok) throw new Error(`Sitemap request failed with HTTP ${response.status}`);
        const xml = await response.text();
        const locations = extractSitemapLocations(xml);
        if (depth >= MAX_SITEMAP_RECURSION_DEPTH || !/<sitemapindex[\s>]/i.test(xml)) return locations;
        const nested = await Promise.all(locations.map((location) => this.collectLocations(location, depth + 1)));
        return nested.flat();
    }

    public async discover(): Promise<SourceDocumentRef[]> {
        const canonicalLanguage = this.policy.canonicalLanguage ?? 'nl';
        const locations = await this.collectLocations(this.sitemapUrl, 0);
        // The same URL can legitimately appear in more than one per-post-type sub-sitemap (e.g.
        // the homepage shows up in both page-sitemap.xml and language-sitemap.xml); de-duplicate
        // so it is not fetched/embedded twice.
        return Array.from(new Set(locations))
            .filter((url) => isAllowedKnowledgeUrl(url, this.policy))
            .map((url) => ({
                sourceType: 'website' as const,
                sourceId: url,
                sourceUrl: url,
                language: detectKnowledgeLanguage(new URL(url).pathname, canonicalLanguage),
            }));
    }

    public async fetch(ref: SourceDocumentRef): Promise<SourceDocument> {
        const response = await fetchWithRetry(this.fetchImpl, ref.sourceUrl);
        if (!response.ok) throw new Error(`Website request failed with HTTP ${response.status}`);
        return { ref, title: ref.sourceUrl, html: await response.text() };
    }
}
