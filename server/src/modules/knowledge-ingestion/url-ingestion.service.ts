import { normalizeKnowledgeDocument, type NormalizedKnowledgeDocument, type SourceDocument } from './knowledge-ingestion.service';
import { checkPublicHttpUrl, type DnsLookup, type UnsafeKnowledgeUrlReason } from './url-safety';

export type UrlImportStatus = 'ready' | 'rejected';
export type UrlImportReason = UnsafeKnowledgeUrlReason | 'request_failed' | 'empty_content';

export interface UrlImportResult {
    status: UrlImportStatus;
    reason?: UrlImportReason;
    document?: NormalizedKnowledgeDocument;
    sourceUrl: string;
}

// A one-off crawl of a single admin-supplied page, distinct from WordPressKnowledgeSource/
// SitemapKnowledgeSource (which discover and crawl an entire allowlisted site on a schedule).
export const importKnowledgeUrl = async (
    sourceUrl: string,
    options: { language?: string; now?: Date; fetchImpl?: typeof fetch; dnsLookup?: DnsLookup } = {},
): Promise<UrlImportResult> => {
    const safety = await checkPublicHttpUrl(sourceUrl, options.dnsLookup);
    if (!safety.safe || !safety.url) return { status: 'rejected', reason: safety.reason ?? 'invalid_url', sourceUrl };
    const safeUrl = safety.url;

    const fetchImpl = options.fetchImpl ?? fetch;
    let response: Response;
    try {
        response = await fetchImpl(safeUrl.href, { redirect: 'error' });
    } catch {
        return { status: 'rejected', reason: 'request_failed', sourceUrl };
    }
    if (!response.ok) return { status: 'rejected', reason: 'request_failed', sourceUrl };

    const html = await response.text();
    const source: SourceDocument = {
        ref: { sourceType: 'manual', sourceId: safeUrl.href, sourceUrl: safeUrl.href, language: options.language ?? 'nl' },
        title: safeUrl.href,
        html,
    };
    const document = normalizeKnowledgeDocument(source, options.now ?? new Date());
    if (!document.content) return { status: 'rejected', reason: 'empty_content', sourceUrl };
    return { status: 'ready', document, sourceUrl };
};
