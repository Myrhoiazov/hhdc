import { SitemapKnowledgeSource, WordPressKnowledgeSource, buildSyncPreview, isAllowedKnowledgeUrl, MysqlKnowledgeRepository, OllamaEmbeddingClient, type KnowledgeSource } from '../src/modules/knowledge-ingestion';
import { indexKnowledgeSources } from '../src/modules/knowledge-ingestion/sync.service';
import prisma from '../prisma/prisma-client';

const baseUrl = process.env.KNOWLEDGE_BASE_URL?.trim();
const domains = (process.env.KNOWLEDGE_ALLOWED_DOMAINS ?? baseUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? '')
    .split(',').map((value) => value.trim()).filter(Boolean);

if (!baseUrl || !domains.length) {
    console.error('Set KNOWLEDGE_BASE_URL and KNOWLEDGE_ALLOWED_DOMAINS before running knowledge:sync.');
    process.exit(1);
}

const canonicalLanguage = process.env.KNOWLEDGE_CANONICAL_LANGUAGE?.trim() || 'nl';
const policy = { allowedDomains: domains, canonicalLanguage };
const dryRun = process.argv.includes('--dry-run');

const main = async () => {
    // The sitemap is the primary discovery source: it is the only place that lists every
    // indexable URL, including custom post types (e.g. this site's "styles" and "choreographer"
    // pages) that have no WordPress REST route at all and are therefore invisible to
    // WordPressKnowledgeSource discovery. WordPress REST is a fallback for sites whose sitemap is
    // unavailable or unparsable.
    const wordpress = new WordPressKnowledgeSource(baseUrl, policy);
    const website = new SitemapKnowledgeSource(`${baseUrl.replace(/\/$/, '')}/sitemap.xml`, policy);
    let source: KnowledgeSource = website;
    let refs;
    try {
        refs = await website.discover();
        console.log('discovery=sitemap');
    } catch (error) {
        console.warn(`Sitemap discovery failed; using WordPress REST fallback: ${error instanceof Error ? error.message : String(error)}`);
        source = wordpress;
        refs = await source.discover();
        console.log('discovery=wordpress');
    }

    const eligibleRefs = refs.filter((ref) => isAllowedKnowledgeUrl(ref.sourceUrl, policy));
    console.log(JSON.stringify({ dryRun, ...buildSyncPreview(refs, policy) }));
    if (dryRun) return;

    const result = await indexKnowledgeSources(eligibleRefs, {
        source,
        embeddings: new OllamaEmbeddingClient(),
        repository: new MysqlKnowledgeRepository(),
        report: event => console.log(JSON.stringify(event)),
    });
    console.log(JSON.stringify({ dryRun: false, ...result }));
    if (result.failed || result.indexed === 0) process.exitCode = 1;
};

main().catch((error) => {
    console.error(JSON.stringify({ stage: 'discovery', error: error instanceof Error ? error.name : 'UnknownError' }));
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
