import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSyncPreview, detectKnowledgeLanguage, isAllowedKnowledgeUrl, normalizeKnowledgeDocument, normalizeKnowledgeHtml, planIncrementalSync, SitemapKnowledgeSource, WordPressKnowledgeSource } from './knowledge-ingestion.service';

const policy = { allowedDomains: ['talentcenter.nl'], excludePatterns: [/\/privacy/] };

test('knowledge policy permits configured domains and excludes operational URLs', () => {
    assert.equal(isAllowedKnowledgeUrl('https://www.talentcenter.nl/classes', policy), true);
    assert.equal(isAllowedKnowledgeUrl('https://talentcenter.nl/wp-admin/edit.php', policy), false);
    assert.equal(isAllowedKnowledgeUrl('https://evil.example/classes', policy), false);
    assert.deepEqual(buildSyncPreview([
        { sourceType: 'website', sourceId: '1', sourceUrl: 'https://talentcenter.nl/a' },
        { sourceType: 'website', sourceId: '2', sourceUrl: 'https://talentcenter.nl/privacy' },
    ], policy), { discovered: 2, eligible: 1, excluded: 1 });
});

test('detectKnowledgeLanguage reads the URL path-prefix segment and falls back to canonical', () => {
    assert.equal(detectKnowledgeLanguage('/nl/schedule/', 'ru'), 'nl');
    assert.equal(detectKnowledgeLanguage('/en/', 'ru'), 'en');
    assert.equal(detectKnowledgeLanguage('/uk/faq/', 'ru'), 'ua');
    assert.equal(detectKnowledgeLanguage('/schedule/', 'ru'), 'ru');
    assert.equal(detectKnowledgeLanguage('/', 'nl'), 'nl');
});

test('isAllowedKnowledgeUrl excludes non-canonical language prefixes and WooCommerce pages', () => {
    const ruCanonical = { allowedDomains: ['talentcenterddc.nl'], canonicalLanguage: 'ru' };
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/schedule/', ruCanonical), true, 'canonical (unprefixed) page is allowed');
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/nl/schedule/', ruCanonical), false, 'nl translation is excluded');
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/en/schedule/', ruCanonical), false, 'en translation is excluded');
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/uk/schedule/', ruCanonical), false, 'uk translation is excluded');
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/cart/', ruCanonical), false);
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/shop/', ruCanonical), false);
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/my-account/', ruCanonical), false);
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/category/uncategorized/', ruCanonical), false, 'thin category archive page is excluded');
    assert.equal(isAllowedKnowledgeUrl('https://talentcenterddc.nl/tag/hip-hop/', ruCanonical), false, 'thin tag archive page is excluded');

    const nlCanonical = { allowedDomains: ['talentcenter.nl'] };
    assert.equal(isAllowedKnowledgeUrl('https://talentcenter.nl/classes', nlCanonical), true, 'default canonical language is nl');
    assert.equal(isAllowedKnowledgeUrl('https://talentcenter.nl/en/classes', nlCanonical), false);
});

test('WordPressKnowledgeSource assigns language from the URL prefix and drops non-canonical translations', async () => {
    const items = [
        { id: 1, link: 'https://talentcenterddc.nl/schedule/' },
        { id: 2, link: 'https://talentcenterddc.nl/nl/schedule/' },
        { id: 3, link: 'https://talentcenterddc.nl/en/schedule/' },
    ];
    const source = new WordPressKnowledgeSource(
        'https://talentcenterddc.nl/',
        { allowedDomains: ['talentcenterddc.nl'], canonicalLanguage: 'ru' },
        async (url) => new Response(JSON.stringify(String(url).includes('/pages') ? items : []), { status: 200 }),
    );
    const refs = await source.discover();
    assert.deepEqual(refs.map((ref) => ({ url: ref.sourceUrl, language: ref.language })), [
        { url: 'https://talentcenterddc.nl/schedule/', language: 'ru' },
    ]);
});

test('normalization strips boilerplate and creates deterministic hash', () => {
    const result = normalizeKnowledgeDocument({
        ref: { sourceType: 'website', sourceId: 'a', sourceUrl: 'https://talentcenter.nl/a', language: 'nl' },
        title: '  Classes  ', html: '<nav>Menu</nav><h1>Classes</h1><p>Dance&nbsp;for all.</p>',
    }, new Date('2026-09-15T00:00:00Z'));
    assert.equal(result.content, 'Classes\n\nDance for all.');
    assert.equal(result.contentHash.length, 64);
    assert.equal(result.active, true);
});

test('normalizeKnowledgeHtml does not treat <link>/<path>/<picture>/<pre> as <li>/<p> by prefix match', () => {
    // Regression: "li" is a prefix of "link" and "p" is a prefix of "path"/"picture"/"pre", so an
    // unanchored /<li[^>]*>/ or /<\/?p[^>]*>/ silently turns every <link> tag in a page's <head>
    // (favicons, canonical, hreflang alternates) into a content-free "- " bullet — found live
    // against talentcenterddc.nl, where it bloated every indexed document with 15-30 useless
    // bullet lines before the real content, wasting the drafting LLM's limited context window.
    const html = '<head><link rel="icon" href="/favicon.ico"><link rel="canonical" href="/x"></head>'
        + '<body><path d="M0 0 L1 1"></path><picture><img src="a.png"></picture><pre>code</pre>'
        + '<p>Real paragraph.</p><ul><li>Real item.</li></ul></body>';
    const result = normalizeKnowledgeHtml(html);
    assert.doesNotMatch(result, /^-\s*$/m, 'no content-free bullet lines from <link>/<path>/etc.');
    assert.match(result, /Real paragraph\./);
    assert.match(result, /- Real item\./);
});

test('sitemap source only discovers allowed URLs', async () => {
    const source = new SitemapKnowledgeSource('https://talentcenter.nl/sitemap.xml', policy, async () => new Response(
        '<urlset><url><loc>https://talentcenter.nl/a</loc></url><url><loc>https://evil.example/b</loc></url></urlset>',
        { status: 200 },
    ));
    const refs = await source.discover();
    assert.deepEqual(refs.map((ref) => ref.sourceUrl), ['https://talentcenter.nl/a']);
});

test('sitemap source parses CDATA-wrapped <loc> values (e.g. All in One SEO output)', async () => {
    const source = new SitemapKnowledgeSource('https://talentcenter.nl/sitemap.xml', policy, async () => new Response(
        '<urlset><url><loc><![CDATA[https://talentcenter.nl/a]]></loc></url></urlset>',
        { status: 200 },
    ));
    const refs = await source.discover();
    assert.deepEqual(refs.map((ref) => ref.sourceUrl), ['https://talentcenter.nl/a']);
});

test('sitemap source recurses into a <sitemapindex> to reach per-post-type sub-sitemaps', async () => {
    const requestedUrls: string[] = [];
    const source = new SitemapKnowledgeSource('https://talentcenter.nl/sitemap.xml', policy, async (url) => {
        const href = String(url);
        requestedUrls.push(href);
        if (href === 'https://talentcenter.nl/sitemap.xml') {
            return new Response(
                '<sitemapindex><sitemap><loc><![CDATA[https://talentcenter.nl/page-sitemap.xml]]></loc></sitemap>'
                + '<sitemap><loc><![CDATA[https://talentcenter.nl/styles-sitemap.xml]]></loc></sitemap></sitemapindex>',
                { status: 200 },
            );
        }
        if (href === 'https://talentcenter.nl/page-sitemap.xml') {
            return new Response('<urlset><url><loc><![CDATA[https://talentcenter.nl/a]]></loc></url></urlset>', { status: 200 });
        }
        if (href === 'https://talentcenter.nl/styles-sitemap.xml') {
            return new Response('<urlset><url><loc><![CDATA[https://talentcenter.nl/styles/hip-hop]]></loc></url></urlset>', { status: 200 });
        }
        throw new Error(`unexpected fetch: ${href}`);
    });
    const refs = await source.discover();
    assert.deepEqual(new Set(refs.map((ref) => ref.sourceUrl)), new Set(['https://talentcenter.nl/a', 'https://talentcenter.nl/styles/hip-hop']));
    assert.deepEqual(requestedUrls.sort(), ['https://talentcenter.nl/page-sitemap.xml', 'https://talentcenter.nl/sitemap.xml', 'https://talentcenter.nl/styles-sitemap.xml']);
});

test('sitemap source de-duplicates a URL that appears in more than one sub-sitemap', async () => {
    const source = new SitemapKnowledgeSource('https://talentcenter.nl/sitemap.xml', policy, async (url) => {
        const href = String(url);
        if (href === 'https://talentcenter.nl/sitemap.xml') {
            return new Response(
                '<sitemapindex><sitemap><loc><![CDATA[https://talentcenter.nl/page-sitemap.xml]]></loc></sitemap>'
                + '<sitemap><loc><![CDATA[https://talentcenter.nl/language-sitemap.xml]]></loc></sitemap></sitemapindex>',
                { status: 200 },
            );
        }
        return new Response('<urlset><url><loc><![CDATA[https://talentcenter.nl/a]]></loc></url></urlset>', { status: 200 });
    });
    const refs = await source.discover();
    assert.deepEqual(refs.map((ref) => ref.sourceUrl), ['https://talentcenter.nl/a']);
});

test('sitemap source retries transient network failures', async () => {
    let attempts = 0;
    const source = new SitemapKnowledgeSource('https://talentcenter.nl/sitemap.xml', policy, async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary network failure');
        return new Response('<urlset><url><loc>https://talentcenter.nl/a</loc></url></urlset>', { status: 200 });
    });
    const refs = await source.discover();
    assert.equal(attempts, 3);
    assert.equal(refs.length, 1);
});

test('incremental planner identifies new, changed, unchanged and removed sources', () => {
    assert.deepEqual(planIncrementalSync([
        { sourceId: 'new', contentHash: '1' },
        { sourceId: 'changed', contentHash: '2' },
        { sourceId: 'same', contentHash: '3' },
    ], [
        { sourceId: 'changed', contentHash: 'old', active: true },
        { sourceId: 'same', contentHash: '3', active: true },
        { sourceId: 'removed', contentHash: '4', active: true },
    ]), {
        newSourceIds: ['new'], changedSourceIds: ['changed'], unchangedSourceIds: ['same'], removedSourceIds: ['removed'],
    });
});
